import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { api } from './api.js';
import { trackers, closeDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

// Security headers. The CSP only allows our own files plus the two map services.
// (Dev mode skips the CSP: Vite's live reload needs inline scripts.)
app.use(helmet({
  contentSecurityPolicy: config.isProduction && {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://service.pdok.nl', 'https://tile.openstreetmap.org'],
      connectSrc: ["'self'", 'https://api.pdok.nl'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  // Map tiles set their own referrer policy per image (see map-layers.js).
  referrerPolicy: { policy: 'no-referrer' },
}));

// Liveness/readiness probe for Docker and Kubernetes.
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', api);

// Page routes -> which HTML page to serve.
//   /s/<id>         kids tracker
//   /demo           kids tracker with URL-param config (testing)
//   /bewerk/<id>    parents page in edit mode (secret token is in the #fragment)
//   /               parents page
function pageFor(urlPath) {
  if (/^\/s\/[A-Za-z0-9]{10}\/?$/.test(urlPath) || urlPath === '/demo') return 'tracker.html';
  if (/^\/bewerk\/[A-Za-z0-9]{10}\/?$/.test(urlPath) || urlPath === '/') return 'index.html';
  return null;
}

const noIndex = (_req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
};

if (config.isProduction) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('/{*path}', noIndex, (req, res) => {
    const page = pageFor(req.path);
    if (!page) return res.status(404).send('Niet gevonden');
    res.sendFile(path.join(distDir, page));
  });
} else {
  // In development Vite runs inside this server: one process, one URL, live reload.
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'mpa' });
  app.use(noIndex, (req, _res, next) => {
    const page = pageFor(req.path);
    if (page) req.url = `/${page}`;
    next();
  });
  app.use(vite.middlewares);
}

// Delete expired trackers now and every hour.
const purge = () => {
  const n = trackers.purgeExpired();
  if (n) console.log(`Purged ${n} expired tracker(s)`);
};
purge();
const purgeTimer = setInterval(purge, 60 * 60_000);
purgeTimer.unref();

const server = app.listen(config.port, config.host, () => {
  console.log(`SPS server listening on http://${config.host}:${config.port}`);
});

// Graceful shutdown so Kubernetes can stop the pod cleanly.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => {
    closeDb();
    process.exit(0);
  }));
}
