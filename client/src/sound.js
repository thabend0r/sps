// All sounds are synthesized with the Web Audio API: no audio files needed.
// Browsers only allow sound after a user gesture, hence the "Geluid" button.

const STORAGE_KEY = 'sps-sound';
let enabled = localStorage.getItem(STORAGE_KEY) === 'on';
let ctx = null;
let master = null;
let noise = null;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    // 0.3 s of white noise, reused for hoof hits and knocks.
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const ready = () => enabled && ctx && ctx.state === 'running';

export function isSoundOn() {
  return enabled;
}

export function setSound(on) {
  enabled = on;
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  if (on) audio();
}

// If sound was left "on" last time, unlock audio on the first tap/click anywhere.
window.addEventListener('pointerdown', () => { if (enabled) audio(); }, { once: true });

// ---- building blocks ---------------------------------------------------------
function noiseHit(t, { freq, q, vol, decay, type = 'bandpass' }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + decay + 0.02);
}

function thump(t, { from, to, vol, decay }) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + decay + 0.02);
}

function tone(t, freq, vol, decay) {
  // A bell-ish tone: fundamental + a few partials, slow decay.
  [[1, 1], [2.0, 0.35], [3.01, 0.15], [4.2, 0.06]].forEach(([mult, amp]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / mult ** 0.5);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  });
}

// ---- the actual sounds -----------------------------------------------------------

/** Ozosnel galloping (three-beat canter). volume 0..1 */
export function hoofbeats(seconds = 2.5, volume = 0.5) {
  if (!ready()) return;
  const start = ctx.currentTime + 0.05;
  const cycle = 0.42;
  for (let c = 0; c * cycle < seconds; c++) {
    // Fade in and out over the burst.
    const pos = (c * cycle) / seconds;
    const env = Math.sin(Math.PI * Math.min(1, pos + 0.1)) * volume;
    [0, 0.085, 0.17].forEach((offset, i) => {
      const t = start + c * cycle + offset + Math.random() * 0.01;
      noiseHit(t, { freq: 1100 + i * 250 + Math.random() * 200, q: 4, vol: 0.5 * env, decay: 0.06 });
      thump(t, { from: 180, to: 70, vol: 0.35 * env, decay: 0.07 });
    });
  }
}

/** Three heavy knocks on the door, twice. */
export function knock() {
  if (!ready()) return;
  const start = ctx.currentTime + 0.05;
  [0, 0.28, 0.56, 1.3, 1.58, 1.86].forEach((offset) => {
    const t = start + offset;
    thump(t, { from: 120, to: 55, vol: 0.9, decay: 0.18 });
    noiseHit(t, { freq: 400, q: 1, vol: 0.5, decay: 0.08, type: 'lowpass' });
  });
}

/** Ding-dong doorbell. */
export function doorbell(delay = 0) {
  if (!ready()) return;
  const t = ctx.currentTime + 0.05 + delay;
  tone(t, 659.25, 0.35, 1.6);       // E5
  tone(t + 0.55, 523.25, 0.35, 2.2); // C5
}

/** Arrival: knock knock knock... and the doorbell. */
export function arrivalSounds() {
  knock();
  doorbell(2.6);
}
