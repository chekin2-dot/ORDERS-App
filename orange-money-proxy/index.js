const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.text({ type: 'text/xml' }));
app.use(express.json());

const PROXY_SECRET = process.env.PROXY_SECRET;
const PORT = process.env.PORT || 3000;
const OM_API_URL = process.env.ORANGE_MONEY_API_URL || 'https://apiom.orange.bf/';
const FIXIE_URL = process.env.FIXIE_URL;

function loadCertificates() {
  const certB64 = process.env.OM_CERT_B64;
  const keyB64 = process.env.OM_KEY_B64;
  if (certB64 && keyB64) {
    console.log('mTLS: loading certificates from base64 environment variables.');
    return {
      cert: Buffer.from(certB64, 'base64'),
      key: Buffer.from(keyB64, 'base64'),
    };
  }

  const certPath = process.env.OM_CERT_PATH || path.join(__dirname, 'certs', 'cert.pem');
  const keyPath = process.env.OM_KEY_PATH || path.join(__dirname, 'certs', 'key.pem');
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log(`mTLS: loading certificates from files (${certPath}, ${keyPath}).`);
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
  }

  console.warn('WARNING: No mTLS certificate found. Set OM_CERT_B64 + OM_KEY_B64 env vars.');
  return null;
}

function buildHttpsAgent(targetHostname) {
  const certs = loadCertificates();
  const agentOptions = {
    rejectUnauthorized: false,
    ...(certs || {}),
  };

  if (FIXIE_URL) {
    console.log(`Outbound routing via Fixie proxy: ${FIXIE_URL.replace(/:\/\/.*@/, '://***@')}`);
    const fixieAgent = new HttpsProxyAgent(FIXIE_URL, agentOptions);
    return fixieAgent;
  }

  return new https.Agent(agentOptions);
}

const httpsAgent = buildHttpsAgent();

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const secret = req.headers['x-proxy-secret'];
  if (!PROXY_SECRET || secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.post('/orange-money/payment-node', (req, res) => {
  try {
    const xmlBody = typeof req.body === 'string' ? req.body : req.body.xml;

    if (!xmlBody) {
      return res.status(400).json({ error: 'Missing XML body' });
    }

    const targetUrl = new URL(OM_API_URL);
    const isHttps = targetUrl.protocol === 'https:';
    const agent = isHttps ? httpsAgent : new http.Agent();
    const postData = Buffer.from(xmlBody, 'utf8');

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        'Content-Length': postData.length,
      },
      agent,
    };

    console.log(`[${new Date().toISOString()}] Forwarding to: ${OM_API_URL}`);

    const lib = isHttps ? https : http;
    const proxyReq = lib.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        console.log(`[${new Date().toISOString()}] OM status: ${proxyRes.statusCode}`);
        console.log(`[${new Date().toISOString()}] OM response: ${data}`);
        res.status(proxyRes.statusCode || 200)
          .set('Content-Type', 'text/xml')
          .send(data);
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      res.status(500).json({ error: error.message });
    });

    proxyReq.write(postData);
    proxyReq.end();

  } catch (error) {
    console.error('Payment-node error:', error);
    res.status(500).json({ error: error.message || 'Proxy error' });
  }
});

app.get('/health', (_req, res) => {
  const certB64 = process.env.OM_CERT_B64;
  const keyB64 = process.env.OM_KEY_B64;
  const certPath = process.env.OM_CERT_PATH || path.join(__dirname, 'certs', 'cert.pem');
  const keyPath = process.env.OM_KEY_PATH || path.join(__dirname, 'certs', 'key.pem');

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    fixie_enabled: !!FIXIE_URL,
    mtls: {
      cert_from_env: !!(certB64 && keyB64),
      cert_from_file: fs.existsSync(certPath) && fs.existsSync(keyPath),
    },
    target_url: OM_API_URL,
  });
});

app.listen(PORT, () => {
  console.log(`Orange Money proxy running on port ${PORT}`);
  console.log(`Target: ${OM_API_URL}`);
  console.log(`Fixie static IP routing: ${FIXIE_URL ? 'ENABLED' : 'DISABLED (set FIXIE_URL env var)'}`);
  const certs = loadCertificates();
  console.log(`mTLS: ${certs ? 'ENABLED' : 'DISABLED (no cert found)'}`);
});
Fix proxy health endpoint to include target_url
