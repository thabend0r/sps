// Falling pepernoten and confetti. Pure DOM + CSS animations (see style.css).
// Positions are set via element.style (CSSOM), which the CSP allows.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CONFETTI_COLORS = ['#c8102e', '#e8b931', '#fff6e5', '#7a0019', '#f2d16b'];

let layer;
function getLayer() {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  return layer;
}

function drop(className, { delayMax = 0, durationMin = 3, durationMax = 6, size }) {
  const el = document.createElement('div');
  el.className = className;
  const duration = durationMin + Math.random() * (durationMax - durationMin);
  el.style.left = `${Math.random() * 100}vw`;
  el.style.animationDuration = `${duration}s`;
  el.style.animationDelay = `${Math.random() * delayMax}s`;
  el.style.setProperty('--drift', `${(Math.random() - 0.5) * 30}vw`);
  el.style.setProperty('--spin', `${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)}deg`);
  if (size) {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
  }
  el.addEventListener('animationend', () => el.remove());
  getLayer().append(el);
  return el;
}

/** A few pepernoten (while Sint is close). */
export function sprinklePepernoten(count = 3) {
  const n = reducedMotion ? 1 : count;
  for (let i = 0; i < n; i++) {
    drop('fx-pepernoot', { delayMax: 1.5, size: 12 + Math.random() * 10 });
  }
}

/** The big arrival party: pepernoten + confetti, then a gentle trickle. */
export function celebrate() {
  const scale = reducedMotion ? 0.2 : 1;
  for (let i = 0; i < 70 * scale; i++) {
    drop('fx-pepernoot', { delayMax: 2.5, durationMin: 2.5, durationMax: 5, size: 12 + Math.random() * 12 });
  }
  for (let i = 0; i < 140 * scale; i++) {
    const el = drop('fx-confetti', { delayMax: 2, durationMin: 3, durationMax: 6 });
    el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  }
  // Keep a gentle trickle going for a while.
  let rounds = reducedMotion ? 0 : 12;
  const timer = setInterval(() => {
    if (rounds-- <= 0) return clearInterval(timer);
    sprinklePepernoten(4);
  }, 2500);
}
