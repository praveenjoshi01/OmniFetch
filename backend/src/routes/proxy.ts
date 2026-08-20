import { Router } from 'express';
import { fetchAndProxyPage } from '../services/proxyService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    const pickMode = req.query.pickMode === 'true';

    if (!targetUrl) {
      return res.status(400).send('URL parameter required');
    }

    const { html, contentType } = await fetchAndProxyPage(targetUrl, pickMode);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Strip security headers so iframe renders properly
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    res.send(html);
  } catch (err: any) {
    res.status(500).send(`Proxy Error: ${err.message}`);
  }
});

export default router;
