import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/berkshire-swash/400.css';
import './style.css';

import { sintIcon, homeIcon } from './icons.js';
import { etaText, messageFor, locationLabels, waitingPlace } from './messages.js';
import { buildRoute, stateAt } from './route.js';
import { hashString, seededRandom } from './random.js';
import { loadTrackerConfig } from './tracker-config.js';

const cfg = loadTrackerConfig();
const route = buildRoute(cfg);

// ---- map ------------------------------------------------------------------
const NL_BOUNDS = L.latLngBounds([50.75, 3.3], [53.55, 7.25]);

const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
  maxBounds: NL_BOUNDS.pad(0.15),
  maxBoundsViscosity: 0.8,
  minZoom: 7,
});
map.fitBounds(NL_BOUNDS);
L.control.zoom({ position: 'topright' }).addTo(map);

// Bottom layer: OpenStreetMap for everything outside NL (neighbours + sea), faded via CSS.
// 'strict-origin' sends only our domain as Referer (OSM requires one), never the secret link path.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  className: 'world-tiles',
  referrerPolicy: 'strict-origin',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

// Top layer: PDOK BRT Achtergrondkaart (Kadaster): free, no API key, only covers NL
// (transparent outside, so OSM shows through). Styles: 'standaard', 'pastel', 'grijs', 'water'.
const TILE_STYLE = 'pastel';
L.tileLayer(`https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/${TILE_STYLE}/EPSG:3857/{z}/{x}/{y}.png`, {
  className: 'nl-tiles',
  attribution: 'Kaartgegevens &copy; <a href="https://www.kadaster.nl">Kadaster</a>',
  maxZoom: 19,
}).addTo(map);

const home = L.latLng(cfg.home.lat, cfg.home.lng);
L.marker(home, { icon: homeIcon, zIndexOffset: 500 }).addTo(map);

const sint = L.marker(home, { icon: sintIcon, zIndexOffset: 1000 });
const trail = L.polyline([], { className: 'sint-trail' }).addTo(map);

// ---- follow mode: keep Sint and the house in view ---------------------------
// Turns off as soon as the child drags/zooms; the button turns it back on.
let following = true;

const FollowControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const btn = L.DomUtil.create('button', 'follow-btn');
    btn.type = 'button';
    btn.textContent = 'Volg Sint';
    btn.hidden = true;
    L.DomEvent.disableClickPropagation(btn);
    btn.addEventListener('click', () => setFollowing(true));
    return btn;
  },
});
const followControl = new FollowControl().addTo(map);

function setFollowing(on) {
  following = on;
  followControl.getContainer().hidden = on;
  if (on) frameView(lastState, true);
}

for (const evt of ['mousedown', 'wheel', 'touchstart', 'keydown']) {
  map.getContainer().addEventListener(evt, (e) => {
    if (e.target.closest?.('.leaflet-control')) return;
    if (following) setFollowing(false);
  }, { passive: true });
}

function frameView(state, animate) {
  if (!following || !state) return;
  // Leave room at the bottom for the status card.
  const opts = { paddingTopLeft: [50, 50], paddingBottomRight: [50, 230], maxZoom: 14, animate, duration: 1.5 };
  if (state.phase === 'waiting') {
    map.flyToBounds(NL_BOUNDS, opts);
  } else if (state.phase === 'arrived') {
    map.flyTo(home, 16, { animate, duration: 1.5 });
  } else {
    // Frame Sint's current target and the house.
    const target = state.city;
    map.flyToBounds(L.latLngBounds([home, [target.lat, target.lng], [state.lat, state.lng]]), opts);
  }
}

// ---- UI -------------------------------------------------------------------
const etaEl = document.getElementById('eta-value');
const msgEl = document.getElementById('status-message');
const cityEl = document.getElementById('current-city');
const labelEl = document.getElementById('location-label');

let lastState = null;
let lastEvent = null;
let lastEta = null;

function onEventChange(state) {
  // Message is fixed per stop (same on every device, stable on refresh).
  const rnd = seededRandom(hashString(`msg:${cfg.seed}:${state.eventIndex}`))();
  msgEl.textContent = messageFor(state, rnd);
  labelEl.textContent = locationLabels[state.phase];
  cityEl.textContent = state.phase === 'waiting' ? waitingPlace : state.city.name;

  if (state.phase === 'waiting') {
    sint.remove();
  } else if (!map.hasLayer(sint)) {
    sint.addTo(map);
  }
  document.body.classList.toggle('arrived', state.phase === 'arrived');
  frameView(state, lastEvent !== null);
}

function tick() {
  const state = stateAt(route, cfg.now());

  if (state.eventIndex !== lastEvent) {
    lastState = state;
    onEventChange(state);
    lastEvent = state.eventIndex;
  }
  lastState = state;

  const eta = etaText(state.minutesLeft);
  if (eta !== lastEta) {
    etaEl.textContent = eta;
    lastEta = eta;
  }
  document.body.classList.toggle('nearby', state.minutesLeft > 0 && state.minutesLeft <= 15);

  if (state.phase !== 'waiting') {
    sint.setLatLng([state.lat, state.lng]);
    const visited = state.stops.slice(0, state.stopIndex + 1).map((s) => [s.lat, s.lng]);
    trail.setLatLngs([...visited, [state.lat, state.lng]]);
  }
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
