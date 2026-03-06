const express = require('express');
const app = express();

app.use(express.json());

const PROXY_SECRET = process.env.PROXY_SECRET;
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const secret = req.headers['x-proxy-secret'];
  if (!PROXY_SECRET || secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.post('/orange-money/payment', async (req, res) => {
  try {
    const { apiUrl, accessToken, payload } = req.body;

    if (!apiUrl || !accessToken || !payload) {
      return res.status(400).json({ error: 'Missing required fields: apiUrl, accessToken, payload' });
    }

    const response = await fetch(`${apiUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy payment error:', error);
    return res.status(500).json({ error: error.message || 'Proxy error' });
  }
});

app.post('/orange-money/token', async (req, res) => {
  try {
    const { tokenUrl, clientId, clientSecret } = req.body;

    if (!tokenUrl || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields: tokenUrl, clientId, clientSecret' });
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy token error:', error);
    return res.status(500).json({ error: error.message || 'Proxy error' });
  }
});

app.post('/orange-money/webpay', async (req, res) => {
  try {
    const { apiUrl, accessToken, merchantKey, payload } = req.body;

    if (!apiUrl || !accessToken || !merchantKey || !payload) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const response = await fetch(`${apiUrl}/webpayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ...payload, merchant_key: merchantKey }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy webpay error:', error);
    return res.status(500).json({ error: error.message || 'Proxy error' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Orange Money proxy server running on port ${PORT}`);
});
