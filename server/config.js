// All runtime settings come from environment variables, so the same image
// runs locally, in docker compose and (later) via Helm.
import path from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  // Folder for the SQLite file (phase 3). Mounted as a volume in the container.
  dataDir: path.resolve(process.env.DATA_DIR ?? './data'),
  // Public URL used to build shortlinks (phase 3).
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',
};
