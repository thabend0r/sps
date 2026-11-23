import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new DatabaseSync(path.join(config.dataDir, 'sps.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS trackers (
    id              TEXT PRIMARY KEY,   -- public, random, used in the kids link
    edit_token_hash TEXT NOT NULL,      -- sha256 of the secret edit token
    lat             REAL NOT NULL,      -- rounded, no street address is stored
    lng             REAL NOT NULL,
    delivery_at     INTEGER NOT NULL,   -- epoch ms
    created_at      INTEGER NOT NULL,
    expires_at      INTEGER NOT NULL    -- row is deleted after this moment
  );
  CREATE INDEX IF NOT EXISTS trackers_expires ON trackers (expires_at);
`);

const stmts = {
  insert: db.prepare(`INSERT INTO trackers (id, edit_token_hash, lat, lng, delivery_at, created_at, expires_at)
                      VALUES (:id, :editTokenHash, :lat, :lng, :deliveryAt, :createdAt, :expiresAt)`),
  get: db.prepare('SELECT * FROM trackers WHERE id = ? AND expires_at > ?'),
  update: db.prepare(`UPDATE trackers SET lat = :lat, lng = :lng, delivery_at = :deliveryAt, expires_at = :expiresAt
                      WHERE id = :id`),
  delete: db.prepare('DELETE FROM trackers WHERE id = ?'),
  purge: db.prepare('DELETE FROM trackers WHERE expires_at <= ?'),
};

export const trackers = {
  insert: (row) => stmts.insert.run(row),
  get: (id) => stmts.get.get(id, Date.now()),
  update: (row) => stmts.update.run(row),
  delete: (id) => stmts.delete.run(id),
  purgeExpired: () => Number(stmts.purge.run(Date.now()).changes),
};

export function closeDb() {
  db.close();
}
