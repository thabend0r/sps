import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const app = express();
app.disable('x-powered-by');

// Liveness/readiness probe for Docker and Kubernetes.
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// API routes come here in phase 3 (/api/...).

if (config.isProduction) {
  // In production the built frontend is served by this same process.
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  // In development Vite runs inside this server: one process, one URL, live reload.
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

const server = app.listen(config.port, config.host, () => {
  console.log(`SPS server listening on http://${config.host}:${config.port}`);
});

// Graceful shutdown so Kubernetes can stop the pod cleanly.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
