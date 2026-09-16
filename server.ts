import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { analyzeWebsite } from './server/analyzer.js';
import { FALLBACK_DEMO_REPORT } from './server/demoData.js';
import { reportCache } from './server/cache.js';
import { validateReportConsistency } from './src/validationPass.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'PublisherCheck API',
      timestamp: new Date().toISOString(),
      cachedDomainsCount: (reportCache as any).store?.size || 0,
    });
  });

  // Main Website Analysis Endpoint
  app.post('/api/check', async (req, res) => {
    try {
      const { url, forceRefresh } = req.body;
      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid website URL (e.g. https://example.com)',
        });
        return;
      }

      const result = await analyzeWebsite(url, !!forceRefresh);
      if (!result.success) {
        res.status(422).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      console.error('Error handling /api/check:', err);
      res.status(500).json({
        success: false,
        error: 'An internal server error occurred while analyzing the website.',
      });
    }
  });

  // Demo Endpoint
  app.get('/api/demo', async (req, res) => {
    try {
      // Attempt live crawl of demo site
      const liveDemo = await analyzeWebsite('https://thedailyfront.com', false);
      if (liveDemo.success && liveDemo.report) {
        res.json(liveDemo);
        return;
      }

      // Fallback benchmark demo dataset
      const validatedDemo = validateReportConsistency({
        ...FALLBACK_DEMO_REPORT,
        analyzedAt: new Date().toISOString(),
      });
      res.json({
        success: true,
        report: validatedDemo,
      });
    } catch {
      const validatedDemo = validateReportConsistency({
        ...FALLBACK_DEMO_REPORT,
        analyzedAt: new Date().toISOString(),
      });
      res.json({
        success: true,
        report: validatedDemo,
      });
    }
  });

  // Cache stats / clear endpoint for dev/admin
  app.get('/api/cache/stats', (req, res) => {
    res.json({
      ttlHours: reportCache.getTTLHours(),
    });
  });

  // Vite Middleware or Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PublisherCheck server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
