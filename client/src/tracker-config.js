// Where the tracker gets its settings from.
//
//   /s/<id>   loaded from the server (the real kids link)
//   /demo     from URL parameters (testing):
//     ?lat=52.15&lng=5.38   home location (default: Amersfoort)
//     ?at=19:30             delivery time today (or a full ISO date/time)
//     ?seed=abc             route variation (default: fixed)
//
// On both:
//     ?demo=60              run the clock 60x faster (preview)
//     ?from=30              start this many minutes before delivery

const params = new URLSearchParams(location.search);
const num = (name) => (params.has(name) ? Number(params.get(name)) : undefined);

function parseDeliveryAt(value) {
  if (!value) return undefined;
  const hm = value.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const d = new Date();
    d.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
    return d.getTime();
  }
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : t;
}

function makeClock(deliveryAt) {
  const speed = num('demo') ?? 1;
  if (speed === 1 && !params.has('from')) return () => Date.now();
  const fromMinutes = num('from') ?? 182;
  const realStart = Date.now();
  const simStart = deliveryAt - fromMinutes * 60_000;
  return () => simStart + (Date.now() - realStart) * speed;
}

export class TrackerNotFound extends Error {}

export async function loadTrackerConfig() {
  const link = location.pathname.match(/^\/s\/([A-Za-z0-9]{10})\/?$/);
  if (link) {
    const res = await fetch(`/api/trackers/${link[1]}`);
    if (res.status === 404) throw new TrackerNotFound();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const t = await res.json();
    return { home: { lat: t.lat, lng: t.lng }, deliveryAt: t.deliveryAt, seed: t.id, now: makeClock(t.deliveryAt) };
  }

  let deliveryAt = parseDeliveryAt(params.get('at'));
  if (deliveryAt === undefined) {
    // Default: delivery in 100 minutes from now, rounded to 5 minutes.
    deliveryAt = Math.ceil((Date.now() + 100 * 60_000) / 300_000) * 300_000;
  }
  return {
    home: { lat: num('lat') ?? 52.1561, lng: num('lng') ?? 5.3878 },
    deliveryAt,
    seed: params.get('seed') ?? 'demo',
    now: makeClock(deliveryAt),
  };
}
