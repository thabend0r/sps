import crypto from 'node:crypto';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { trackers } from './db.js';

const DAY = 24 * 60 * 60_000;
// Generous box around the Netherlands (incl. Wadden islands).
const NL_BOX = { minLat: 50.7, maxLat: 53.7, minLng: 3.2, maxLng: 7.3 };
// Data is kept until this long after the delivery moment.
const KEEP_AFTER_DELIVERY = 2 * DAY;

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function randomId(length = 10) {
  // Rejection sampling: no modulo bias.
  let out = '';
  while (out.length < length) {
    for (const b of crypto.randomBytes(length * 2)) {
      if (b < 248 && out.length < length) out += BASE62[b % 62];
    }
  }
  return out;
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// ~11 m precision: enough to put the pin on the house, no more.
const round4 = (n) => Math.round(n * 1e4) / 1e4;

function validate(body) {
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const deliveryAt = Number(body?.deliveryAt);
  const now = Date.now();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < NL_BOX.minLat || lat > NL_BOX.maxLat || lng < NL_BOX.minLng || lng > NL_BOX.maxLng) {
    return { error: 'Locatie moet in Nederland liggen.' };
  }
  if (!Number.isInteger(deliveryAt) || deliveryAt < now - 60 * 60_000 || deliveryAt > now + 90 * DAY) {
    return { error: 'Kies een tijdstip in de komende 90 dagen.' };
  }
  return { value: { lat: round4(lat), lng: round4(lng), deliveryAt } };
}

const publicView = (row) => ({ id: row.id, lat: row.lat, lng: row.lng, deliveryAt: row.delivery_at });

/** Checks "Authorization: Bearer <editToken>" against the stored hash. */
function authorized(req, row) {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  if (!m) return false;
  const a = Buffer.from(sha256(m[1]), 'hex');
  const b = Buffer.from(row.edit_token_hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ID_RE = /^[A-Za-z0-9]{10}$/;

const limitMessage = { error: 'Even rustig aan! Probeer het later nog eens.' };
const apiLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.rateLimit.apiPer15Min,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limitMessage,
});
const createLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: config.rateLimit.createPerHour,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Je hebt al veel Sint-links gemaakt. Probeer het over een uurtje nog eens.' },
});

export const api = express.Router();
api.use(apiLimiter);
api.use(express.json({ limit: '2kb' }));
api.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

api.post('/trackers', createLimiter, (req, res) => {
  const { value, error } = validate(req.body);
  if (error) return res.status(400).json({ error });
  const id = randomId();
  const editToken = crypto.randomBytes(24).toString('base64url');
  trackers.insert({
    id,
    editTokenHash: sha256(editToken),
    ...value,
    createdAt: Date.now(),
    expiresAt: value.deliveryAt + KEEP_AFTER_DELIVERY,
  });
  res.status(201).json({ ...publicView({ id, lat: value.lat, lng: value.lng, delivery_at: value.deliveryAt }), editToken });
});

api.get('/trackers/:id', (req, res) => {
  const row = ID_RE.test(req.params.id) && trackers.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Niet gevonden.' });
  res.json(publicView(row));
});

api.put('/trackers/:id', (req, res) => {
  const row = ID_RE.test(req.params.id) && trackers.get(req.params.id);
  if (!row || !authorized(req, row)) return res.status(404).json({ error: 'Niet gevonden.' });
  const { value, error } = validate(req.body);
  if (error) return res.status(400).json({ error });
  trackers.update({ id: row.id, ...value, expiresAt: value.deliveryAt + KEEP_AFTER_DELIVERY });
  res.json(publicView({ id: row.id, lat: value.lat, lng: value.lng, delivery_at: value.deliveryAt }));
});

api.delete('/trackers/:id', (req, res) => {
  const row = ID_RE.test(req.params.id) && trackers.get(req.params.id);
  if (!row || !authorized(req, row)) return res.status(404).json({ error: 'Niet gevonden.' });
  trackers.delete(row.id);
  res.status(204).end();
});

api.use((_req, res) => res.status(404).json({ error: 'Niet gevonden.' }));

// Malformed JSON etc.
// eslint-disable-next-line no-unused-vars
api.use((err, _req, res, _next) => {
  res.status(err.status ?? 500).json({ error: err.status ? 'Ongeldig verzoek.' : 'Er ging iets mis.' });
});
