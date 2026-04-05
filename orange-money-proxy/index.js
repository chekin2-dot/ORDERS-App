const express = require('express');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

const app = express();
app.use(express.text({ type: 'text/xml' }));
app.use(express.json());

const PROXY_SECRET = process.env.PROXY_SECRET;
const PORT = process.env.PORT || 3000;
const OM_API_URL = process.env.ORANGE_MONEY_API_URL || 'https://apiom.orange.bf/';
const FIXIE_URL = process.env.FIXIE_URL;

if (!FIXIE_URL) {
  console.warn('WARNING: FIXIE_URL env var is not set. Outbound requests will use the server\'s default IP, which may not be whitelisted by Orange Money API.');
} else {
  console.log(`Outbound routing via Fixie proxy: ${FIXIE_URL.replace(/:\/\/.*@/, '://***@')}`);
}

function loadCertificates() {
  const certB64 = process.env.OM_CERT_B64;
  const keyB64 = process.env.OM_KEY_B64;
  if (certB64 && keyB64) {
    console.log('mTLS: loading certificates from base64 environment variables.');
    return {
      cert: Buffer.from(certB64, 'base64').toString('utf8'),
      key: Buffer.from(keyB64, 'base64').toString('utf8'),
    };
  }

  const certPath = process.env.OM_CERT_PATH || path.join(__dirname, 'certs', 'cert.pem');
  const keyPath = process.env.OM_KEY_PATH || path.join(__dirname, 'certs', 'key.pem');
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log(`mTLS: loading certificates from files (${certPath}, ${keyPath}).`);
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
    };
  }

  console.warn('WARNING: No mTLS certificate found. Set OM_CERT_B64 + OM_KEY_B64 env vars.');
  return null;
}

function buildAgent() {
  const certs = loadCertificates();
  if (FIXIE_URL) {
    return new HttpsProxyAgent(FIXIE_URL, {
      rejectUnauthorized: false,
      ...(certs || {}),
    });
  }
  if (certs) {
    const https = require('https');
    return new https.Agent({
      rejectUnauthorized: false,
      ...certs,
    });
  }
  return undefined;
}

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const secret = req.headers['x-proxy-secret'];
  if (!PROXY_SECRET || secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.post('/orange-money/payment-node', async (req, res) => {
  try {
    const xmlBody = typeof req.body === 'string' ? req.body : req.body.xml;

    if (!xmlBody) {
      return res.status(400).json({ error: 'Missing XML body' });
    }

    const agent = buildAgent();
    const targetUrl = OM_API_URL.endsWith('/') ? OM_API_URL : OM_API_URL + '/';

    console.log(`[${new Date().toISOString()}] Forwarding to: ${targetUrl}`);

    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
      body: xmlBody,
    };
    if (agent) fetchOptions.agent = agent;

    const response = await fetch(targetUrl, fetchOptions);

    const responseText = await response.text();
    console.log(`[${new Date().toISOString()}] OM status: ${response.status}`);
    console.log(`[${new Date().toISOString()}] OM response: ${responseText}`);

    res.status(response.status)
      .set('Content-Type', 'text/xml')
      .send(responseText);

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
    fixie_url_prefix: FIXIE_URL ? FIXIE_URL.replace(/:\/\/.*@/, '://***@') : 'not configured',
    mtls: {
      cert_from_env: !!(certB64 && keyB64),
      cert_from_file: fs.existsSync(certPath) && fs.existsSync(keyPath),
    },
    target_url: OM_API_URL,
    node_version: process.version,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Orange Money proxy running on port ${PORT}`);
  console.log(`Target: ${OM_API_URL}`);
  console.log(`Fixie static IP routing: ${FIXIE_URL ? 'ENABLED' : 'DISABLED (no FIXIE_URL set)'}`);
  const certs = loadCertificates();
  console.log(`mTLS: ${certs ? 'ENABLED' : 'DISABLED (no cert found)'}`);
});
