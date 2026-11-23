// Where the tracker gets its settings from.
// Phase 2: URL parameters (for testing). Phase 3: loaded from the server by link id.
//
//   ?lat=52.15&lng=5.38   home location (default: Amersfoort)
//   ?at=19:30             delivery time today (or a full ISO date/time)
//   ?seed=abc             route variation (default: fixed)
//   ?demo=60              run the clock 60x faster
//   ?from=30              with demo: start this many minutes before delivery

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

export function loadTrackerConfig() {
  const speed = num('demo') ?? 1;
  const fromMinutes = num('from') ?? 182;

  let deliveryAt = parseDeliveryAt(params.get('at'));
  if (deliveryAt === undefined) {
    // Default: delivery in 100 minutes from now, rounded to 5 minutes.
    deliveryAt = Math.ceil((Date.now() + 100 * 60_000) / 300_000) * 300_000;
  }

  // Clock: real time, or a fast-forwarded demo clock.
  let now = () => Date.now();
  if (speed !== 1 || params.has('from')) {
    const realStart = Date.now();
    const simStart = deliveryAt - fromMinutes * 60_000;
    now = () => simStart + (Date.now() - realStart) * speed;
  }

  return {
    home: { lat: num('lat') ?? 52.1561, lng: num('lng') ?? 5.3878 },
    deliveryAt,
    seed: params.get('seed') ?? 'demo',
    now,
  };
}
