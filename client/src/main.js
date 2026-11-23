import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/berkshire-swash/400.css';
import './style.css';

import { sintIcon, homeIcon } from './icons.js';
import { etaText, pickMessage } from './messages.js';
import { demoHome, demoRoute, demoHopSeconds } from './demo.js';

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

L.marker([demoHome.lat, demoHome.lng], { icon: homeIcon, zIndexOffset: 500 }).addTo(map);

const start = demoRoute[0];
const sint = L.marker([start.lat, start.lng], { icon: sintIcon, zIndexOffset: 1000 }).addTo(map);
const trail = L.polyline([[start.lat, start.lng]], { className: 'sint-trail' }).addTo(map);

// ---- UI -------------------------------------------------------------------
const etaEl = document.getElementById('eta-value');
const msgEl = document.getElementById('status-message');
const cityEl = document.getElementById('current-city');

function updateStatus(stop) {
  etaEl.textContent = etaText(stop.minutesLeft);
  msgEl.textContent = pickMessage(stop.minutesLeft, stop.city);
  cityEl.textContent = stop.city;
  document.body.classList.toggle('nearby', stop.minutesLeft > 0 && stop.minutesLeft <= 15);
  document.body.classList.toggle('arrived', stop.minutesLeft === 0);
}

// Smoothly slide the marker from a to b.
function animateTo(from, to, durationMs) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    function frame(now) {
      const t = Math.min(1, (now - t0) / durationMs);
      const k = ease(t);
      const pos = L.latLng(from.lat + (to.lat - from.lat) * k, from.lng + (to.lng - from.lng) * k);
      sint.setLatLng(pos);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

// ---- demo loop (phase 1) ----------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runDemo() {
  for (;;) {
    sint.setLatLng([start.lat, start.lng]);
    trail.setLatLngs([[start.lat, start.lng]]);
    updateStatus(start);
    await sleep(demoHopSeconds * 1000);

    for (let i = 1; i < demoRoute.length; i++) {
      const stop = demoRoute[i];
      await animateTo(demoRoute[i - 1], stop, 1500);
      trail.addLatLng([stop.lat, stop.lng]);
      updateStatus(stop);
      await sleep(demoHopSeconds * 1000);
    }
    await sleep(4000);
  }
}

runDemo();
