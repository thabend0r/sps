import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/berkshire-swash/400.css';
import './theme.css';
import './style.css';

import { sintIcon, homeIcon } from './icons.js';
import { addBaseLayers, NL_BOUNDS } from './map-layers.js';
import { etaText, messageFor, locationLabels, waitingPlace } from './messages.js';
import { buildRoute, stateAt } from './route.js';
import { hashString, seededRandom } from './random.js';
import { loadTrackerConfig, TrackerNotFound } from './tracker-config.js';
import { celebrate, sprinklePepernoten } from './effects.js';
import { isSoundOn, setSound, hoofbeats, arrivalSounds } from './sound.js';
import { isEvening, addStars } from './evening.js';

// ---- map ------------------------------------------------------------------
const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
  maxBounds: NL_BOUNDS.pad(0.15),
  maxBoundsViscosity: 0.8,
  minZoom: 6,
});
map.fitBounds(NL_BOUNDS);
L.control.zoom({ position: 'topright' }).addTo(map);

addBaseLayers(map);

// Re-measure whenever the map element changes size (mobile address bar collapsing,
// web fonts changing the banner height, rotating the phone). Leaflet only listens
// to window resizes; without this, part of the map stays empty.
new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(map.getContainer());
document.fonts?.ready.then(() => map.invalidateSize({ pan: false }));

// ---- load config ------------------------------------------------------------
let cfg;
try {
  cfg = await loadTrackerConfig();
} catch (err) {
  showError(err instanceof TrackerNotFound
    ? 'Deze Sint-link werkt niet (meer). Vraag papa of mama om een nieuwe!'
    : 'Oeps, de Sint-tracker kon niet laden. Probeer het straks nog eens.');
  throw err;
}
const route = buildRoute(cfg);

function showError(text) {
  document.getElementById('eta-value').textContent = '🙁';
  document.querySelector('.eta-label').textContent = '';
  document.getElementById('status-message').textContent = text;
  document.querySelector('.location').hidden = true;
}


const home = L.latLng(cfg.home.lat, cfg.home.lng);
L.marker(home, { icon: homeIcon, zIndexOffset: 500 }).addTo(map);

const sint = L.marker(home, { icon: sintIcon, zIndexOffset: 1000 });
const trail = L.polyline([], { className: 'sint-trail' }).addTo(map);

// While the map zooms, Leaflet scales the existing trail with a CSS transform.
// Redrawing it at the same time scales it twice (trail drifts away from Sint),
// so pause trail updates during zooms and redraw once the movement is done.
let mapZooming = false;
let trailPoints = [];
map.on('zoomstart', () => { mapZooming = true; });
map.on('moveend', () => {
  mapZooming = false;
  trail.setLatLngs(trailPoints);
});

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

// ---- sound on/off button ------------------------------------------------------
const SoundControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd() {
    const btn = L.DomUtil.create('button', 'sound-btn');
    btn.type = 'button';
    const render = () => {
      btn.textContent = isSoundOn() ? '🔊 Geluid aan' : '🔇 Geluid uit';
      btn.setAttribute('aria-pressed', String(isSoundOn()));
    };
    render();
    L.DomEvent.disableClickPropagation(btn);
    btn.addEventListener('click', () => {
      setSound(!isSoundOn());
      render();
      if (isSoundOn()) hoofbeats(1.2, 0.4); // a little preview
    });
    return btn;
  },
});
new SoundControl().addTo(map);

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
  // Keep clear of the status card at the bottom (its real height, so it works on phones too).
  const card = document.querySelector('.status-card');
  const side = window.innerWidth < 600 ? 30 : 50;
  const opts = {
    paddingTopLeft: [side, side + 20],
    paddingBottomRight: [side, (card?.offsetHeight ?? 200) + 30],
    maxZoom: 14,
    animate,
    duration: 1.5,
  };
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
let lastEvening = null;

addStars(document.querySelector('.banner'));

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

  // Arrival party (also when the page is opened after arrival, but without sound then).
  if (state.phase === 'arrived') {
    celebrate();
    if (lastEvent !== null) arrivalSounds();
  } else if (state.minutesLeft <= 15 && state.phase !== 'waiting') {
    hoofbeats(2.5, nearbyVolume(state.minutesLeft));
  }
}

// Hoofbeats get louder as Sint gets closer (0.25 at 15 min -> 0.9 at 0 min).
const nearbyVolume = (minutesLeft) => 0.25 + 0.65 * (1 - Math.min(15, minutesLeft) / 15);

// While Sint is close: a few pepernoten now and then, and hoofbeats while he's moving.
setInterval(() => {
  if (!lastState || lastState.phase === 'waiting' || lastState.phase === 'arrived') return;
  if (lastState.minutesLeft > 15) return;
  sprinklePepernoten(3);
  if (lastState.phase === 'traveling') hoofbeats(2, nearbyVolume(lastState.minutesLeft));
}, 7000);

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

  const evening = isEvening(cfg.now());
  if (evening !== lastEvening) {
    document.body.classList.toggle('evening', evening);
    lastEvening = evening;
  }

  if (state.phase !== 'waiting') {
    sint.setLatLng([state.lat, state.lng]);
    const visited = state.stops.slice(0, state.stopIndex + 1).map((s) => [s.lat, s.lng]);
    trailPoints = [...visited, [state.lat, state.lng]];
    if (!mapZooming) trail.setLatLngs(trailPoints);
  }
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
