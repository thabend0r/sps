// The Sinterklaas route simulation. Pure functions, no DOM: easy to test.
import { cities } from './cities.js';
import { seededRandom, pick } from './random.js';

const MIN = 60_000;

/** Tunables (minutes / km). */
export const ROUTE_SETTINGS = {
  windowMinutes: 180,      // Sint appears this long before delivery
  nearbyArriveMinutes: 14, // arrives in "jouw buurt" this long before delivery
  nearbyLeaveMinutes: 3,   // leaves "jouw buurt" for the house
  minCities: 14,           // number of cities visited (random between min and max)
  maxCities: 18,
  minHopKm: 12,            // preferred distance between two cities
  maxHopKm: 60,
  wanderKm: 25,            // randomness: higher = more zigzag, lower = more direct
  closeInCurve: 1.6,       // >1: stay far away longer and close in later in the evening
  excludeNearHomeKm: 4,    // don't use a city as stop if home is inside it
}

export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pickCities(home, rnd, s) {
  const pool = cities.filter((c) => distanceKm(c, home) > s.excludeNearHomeKm);
  const toHome = (c) => distanceKm(c, home);
  const maxD = Math.max(...pool.map(toHome));
  const start = pick(rnd, pool.filter((c) => toHome(c) >= maxD * 0.6));
  const count = s.minCities + Math.floor(rnd() * (s.maxCities - s.minCities + 1));
  const d0 = toHome(start);

  // Every step has a "target distance to home" that shrinks over the evening
  // (slowly at first, faster at the end). Sint picks a city at a reasonable hop
  // that is close to that target distance; the random part makes him zigzag.
  const path = [start];
  let cur = start;
  for (let k = 1; k < count; k++) {
    const progress = k / (count - 1);
    const target = d0 * (1 - progress ** s.closeInCurve);
    const unused = pool.filter((c) => !path.includes(c));
    let cand = unused.filter((c) => {
      const hop = distanceKm(cur, c);
      return hop >= s.minHopKm && hop <= s.maxHopKm;
    });
    if (cand.length === 0) {
      cand = unused.sort((a, b) => distanceKm(cur, a) - distanceKm(cur, b)).slice(0, 5);
    }
    if (cand.length === 0) break;
    let best = null;
    let bestScore = Infinity;
    for (const c of cand) {
      const score = Math.abs(toHome(c) - target) + rnd() * s.wanderKm;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    cur = best;
    path.push(cur);
  }
  return path;
}

/**
 * Build the full route. Each stop: { name, lat, lng, arrive, depart, kind }.
 * kind: 'city' | 'nearby' | 'home'. Times are epoch milliseconds.
 */
export function buildRoute({ home, deliveryAt, seed, settings = ROUTE_SETTINGS }) {
  const s = settings;
  const rnd = seededRandom(`route:${seed}`);
  const T = deliveryAt;
  const startAt = T - s.windowMinutes * MIN;

  const path = pickCities(home, rnd, s);

  // "jouw buurt": a point 1.2-2 km from home in a random direction.
  const bearing = rnd() * 2 * Math.PI;
  const km = 1.2 + rnd() * 0.8;
  const nearby = {
    name: 'jouw buurt',
    lat: home.lat + (km / 111) * Math.cos(bearing),
    lng: home.lng + (km / (111 * Math.cos((home.lat * Math.PI) / 180))) * Math.sin(bearing),
  };

  // Spread the time until nearby-arrival over visits and travel legs.
  // Visits get 0.6-1.2 units, travel gets 1 unit per 30 km (min 0.4).
  const legTargets = [...path.slice(1), nearby];
  const visitW = path.map(() => 0.6 + rnd() * 0.6);
  const travelW = legTargets.map((to, i) => Math.max(0.4, distanceKm(path[i], to) / 30));
  const totalW = visitW.reduce((a, b) => a + b, 0) + travelW.reduce((a, b) => a + b, 0);
  const budget = (s.windowMinutes - s.nearbyArriveMinutes) * MIN;
  const unit = budget / totalW;

  const stops = [];
  let t = startAt;
  path.forEach((c, i) => {
    const arrive = t;
    const depart = arrive + visitW[i] * unit;
    stops.push({ name: c.name, lat: c.lat, lng: c.lng, arrive, depart, kind: 'city' });
    t = depart + travelW[i] * unit;
  });
  stops.push({ ...nearby, arrive: T - s.nearbyArriveMinutes * MIN, depart: T - s.nearbyLeaveMinutes * MIN, kind: 'nearby' });
  stops.push({ name: 'jouw huis', lat: home.lat, lng: home.lng, arrive: T, depart: Infinity, kind: 'home' });

  return { stops, startAt, deliveryAt: T, seed };
}

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/**
 * Where is Sint at time `now`?
 * phase: 'waiting' | 'visiting' | 'traveling' | 'arrived'
 * eventIndex: changes on every arrival/departure (used to pick a stable message).
 */
export function stateAt(route, now) {
  const { stops, startAt, deliveryAt } = route;
  const minutesLeft = Math.max(0, Math.ceil((deliveryAt - now) / MIN));
  const base = { minutesLeft, stops };

  if (now < startAt) {
    return { ...base, phase: 'waiting', eventIndex: -1, stopIndex: -1, lat: stops[0].lat, lng: stops[0].lng };
  }
  if (now >= deliveryAt) {
    const home = stops[stops.length - 1];
    return { ...base, phase: 'arrived', eventIndex: stops.length * 2, stopIndex: stops.length - 1, city: home, lat: home.lat, lng: home.lng };
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const stop = stops[i];
    const next = stops[i + 1];
    if (now < stop.depart) {
      return { ...base, phase: 'visiting', eventIndex: i * 2, stopIndex: i, city: stop, lat: stop.lat, lng: stop.lng };
    }
    if (now < next.arrive) {
      const f = easeInOut((now - stop.depart) / (next.arrive - stop.depart));
      return {
        ...base, phase: 'traveling', eventIndex: i * 2 + 1, stopIndex: i, city: next,
        lat: stop.lat + (next.lat - stop.lat) * f,
        lng: stop.lng + (next.lng - stop.lng) * f,
      };
    }
  }
  // Unreachable in practice (handled by 'arrived'), but be safe.
  const home = stops[stops.length - 1];
  return { ...base, phase: 'arrived', eventIndex: stops.length * 2, stopIndex: stops.length - 1, city: home, lat: home.lat, lng: home.lng };
}
