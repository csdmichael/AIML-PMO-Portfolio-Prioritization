import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read server.config.json
const configPath = path.join(__dirname, 'server.config.json');
const rawConfig = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(rawConfig);

const app = express();
const port = process.env.PORT || config.port || 8080;
const staticPath = path.join(__dirname, config.staticFolder || 'www');

// Read APIM environment variables configured by name in server.config.json
const apimBaseUrl = process.env[config.apimBaseUrlEnv] || '';
const apimKey = process.env[config.apimSubscriptionKeyEnv] || '';

// API Proxy to APIM_BASE_URL adding Ocp-Apim-Subscription-Key header
const apiProxyPath = config.apiProxyPath || '/api';

app.use(apiProxyPath, async (req, res) => {
  if (!apimBaseUrl) {
    return res.status(503).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'API Gateway Not Configured',
      status: 503,
      detail: `Environment variable ${config.apimBaseUrlEnv} is not defined.`,
    });
  }

  // Construct target URL
  const targetUrl = new URL(req.url, apimBaseUrl.endsWith('/') ? apimBaseUrl : apimBaseUrl + '/');

  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host' && typeof value === 'string') {
        headers.set(key, value);
      }
    }

    // Attach APIM Subscription Key from secure environment variable
    if (apimKey) {
      headers.set('Ocp-Apim-Subscription-Key', apimKey);
    }

    const init = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      init.body = req;
      init.duplex = 'half';
    }

    const apiRes = await fetch(targetUrl.toString(), init);

    res.status(apiRes.status);
    apiRes.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const buffer = await apiRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Bad Gateway',
      status: 502,
      detail: err?.message || 'Error proxying request to APIM',
    });
  }
});

// Serve static frontend files
app.use(express.static(staticPath));

// SPA Fallback to index.html
if (config.spaFallback) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`PMO UI Server running on port ${port}`);
});
