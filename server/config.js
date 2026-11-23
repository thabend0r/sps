// All runtime settings come from environment variables, so the same image
// runs locally, in docker compose and via Helm.
import path from 'node:path';

const int = (name, fallback) => {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : Number.parseInt(v, 10);
};

// TRUST_PROXY: how many reverse proxies (e.g. Traefik) sit in front of the app.
// Needed so rate limiting sees the real client IP instead of the proxy's.
function trustProxy() {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '' || v === 'false') return false;
  if (v === 'true') return true;
  return /^\d+$/.test(v) ? Number(v) : v; // number of hops, or a subnet list
}

export const config = {
  port: int('PORT', 3000),
  host: process.env.HOST ?? '0.0.0.0',
  // Folder for the SQLite file. Mounted as a volume in the container.
  dataDir: path.resolve(process.env.DATA_DIR ?? './data'),
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: trustProxy(),
  rateLimit: {
    createPerHour: int('RATE_LIMIT_CREATE_PER_HOUR', 10), // new links per IP
    apiPer15Min: int('RATE_LIMIT_API_PER_15MIN', 300),    // all API calls per IP
  },
};
