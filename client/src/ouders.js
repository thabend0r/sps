import L from 'leaflet';
import QRCode from 'qrcode';
import 'leaflet/dist/leaflet.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/berkshire-swash/400.css';
import './theme.css';
import './ouders.css';

import { homeIcon } from './icons.js';
import { addBaseLayers, NL_BOUNDS } from './map-layers.js';
import { attachAutocomplete, lookupAddress } from './address-search.js';

const $ = (id) => document.getElementById(id);
const form = $('tracker-form');
const dateEl = $('date');
const timeEl = $('time');
const errorEl = $('form-error');
const submitBtn = $('submit-btn');
const deleteBtn = $('delete-btn');

// Edit mode: /bewerk/<id>#<editToken>. The token stays in the #fragment,
// so it is never sent to the server in a URL or logged.
const editMatch = location.pathname.match(/^\/bewerk\/([A-Za-z0-9]{10})\/?$/);
let tracker = editMatch ? { id: editMatch[1], editToken: location.hash.slice(1) } : null;

// ---- map with draggable house -------------------------------------------------
const map = L.map('pick-map', { maxBounds: NL_BOUNDS.pad(0.15), minZoom: 7 });
map.fitBounds(NL_BOUNDS);
addBaseLayers(map);

let pin = null;
function setPin(lat, lng, zoom = 17) {
  if (!pin) {
    pin = L.marker([lat, lng], { icon: homeIcon, draggable: true, autoPan: true }).addTo(map);
  } else {
    pin.setLatLng([lat, lng]);
  }
  map.setView([lat, lng], zoom);
  $('pin-hint').textContent = 'Staat het huisje niet precies goed? Sleep het naar de juiste plek.';
}

attachAutocomplete($('address'), $('suggestions'), async (item) => {
  try {
    const place = await lookupAddress(item.id);
    setPin(place.lat, place.lng);
    showError(null);
  } catch {
    showError('Dit adres kon niet gevonden worden. Probeer een ander adres.');
  }
});

// ---- date/time helpers ----------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
function fillWhen(ms) {
  const d = new Date(ms);
  dateEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  timeEl.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function readWhen() {
  if (!dateEl.value || !timeEl.value) return NaN;
  return new Date(`${dateEl.value}T${timeEl.value}`).getTime();
}

// Default: pakjesavond 5 december 19:00 (this year, or next year if already past).
function defaultWhen() {
  const now = new Date();
  let d = new Date(now.getFullYear(), 11, 5, 19, 0);
  if (d.getTime() < now.getTime() - 6 * 60 * 60_000) d = new Date(now.getFullYear() + 1, 11, 5, 19, 0);
  return d.getTime();
}

// ---- UI helpers ----------------------------------------------------------------
function showError(text) {
  errorEl.hidden = !text;
  errorEl.textContent = text ?? '';
}

function showResult(t) {
  const kids = `${location.origin}/s/${t.id}`;
  $('kids-link').value = kids;
  $('kids-open').href = kids;
  $('preview-link').href = `${kids}?demo=60`;
  renderQr(kids);
  $('edit-link').value = `${location.origin}/bewerk/${t.id}#${t.editToken}`;
  $('result').hidden = false;
  $('intro').textContent = 'Je kunt het tijdstip of de plek hieronder nog aanpassen.';
  submitBtn.textContent = 'Wijzigingen opslaan';
  deleteBtn.hidden = false;
}

async function renderQr(url) {
  const canvas = $('kids-qr');
  await QRCode.toCanvas(canvas, url, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#7a0019', light: '#ffffff' },
  });
  $('qr-download').href = canvas.toDataURL('image/png');
}

document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const input = $(btn.dataset.copy);
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand?.('copy');
    }
    const old = btn.textContent;
    btn.textContent = 'Gekopieerd!';
    setTimeout(() => { btn.textContent = old; }, 1500);
  });
});

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (tracker?.editToken) headers.Authorization = `Bearer ${tracker.editToken}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body && JSON.stringify(body) });
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error ?? 'Er ging iets mis.'), { status: res.status });
  return data;
}

// ---- submit / delete ------------------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError(null);
  if (!pin) return showError('Kies eerst jullie adres.');
  const deliveryAt = readWhen();
  if (Number.isNaN(deliveryAt)) return showError('Kies een datum en tijd.');
  if (deliveryAt < Date.now()) return showError('Dat tijdstip is al geweest. Kies een moment in de toekomst.');

  const { lat, lng } = pin.getLatLng();
  submitBtn.disabled = true;
  try {
    if (tracker?.id && tracker.editToken) {
      await api('PUT', `/trackers/${tracker.id}`, { lat, lng, deliveryAt });
      submitBtn.textContent = 'Opgeslagen ✓';
      setTimeout(() => { submitBtn.textContent = 'Wijzigingen opslaan'; }, 2000);
    } else {
      const created = await api('POST', '/trackers', { lat, lng, deliveryAt });
      tracker = { id: created.id, editToken: created.editToken };
      // Turn this page into the edit page, so a refresh/bookmark keeps working.
      history.replaceState(null, '', `/bewerk/${tracker.id}#${tracker.editToken}`);
      showResult(tracker);
      $('result').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

deleteBtn.addEventListener('click', async () => {
  if (!confirm('Weet je zeker dat je deze Sint-tracker wilt verwijderen? De link werkt dan niet meer.')) return;
  try {
    await api('DELETE', `/trackers/${tracker.id}`);
    location.href = '/';
  } catch (err) {
    showError(err.message);
  }
});

// ---- start ---------------------------------------------------------------------
async function init() {
  if (!tracker) {
    fillWhen(defaultWhen());
    return;
  }
  try {
    if (!tracker.editToken) throw new Error();
    const t = await api('GET', `/trackers/${tracker.id}`);
    setPin(t.lat, t.lng);
    fillWhen(t.deliveryAt);
    showResult(tracker);
  } catch {
    tracker = null;
    history.replaceState(null, '', '/');
    fillWhen(defaultWhen());
    showError('Deze bewerk-link werkt niet (meer). Je kunt hieronder een nieuwe Sint-link maken.');
  }
}
init();
