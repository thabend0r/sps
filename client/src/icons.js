import L from 'leaflet';

const mitreSvg = `
<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M8 72 L8 34 Q8 10 32 2 Q56 10 56 34 L56 72 Z" fill="#c8102e" stroke="#e8b931" stroke-width="4"/>
  <rect x="28" y="18" width="8" height="34" fill="#e8b931"/>
  <rect x="20" y="28" width="24" height="8" fill="#e8b931"/>
</svg>`;

const houseSvg = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="40" y="8" width="8" height="16" fill="#7a3b1e"/>
  <path d="M4 32 L32 8 L60 32 Z" fill="#c8102e" stroke="#7a0019" stroke-width="2"/>
  <rect x="12" y="30" width="40" height="28" fill="#fff6e5" stroke="#7a3b1e" stroke-width="2"/>
  <rect x="27" y="40" width="10" height="18" fill="#7a3b1e"/>
  <rect x="16" y="36" width="8" height="8" fill="#e8b931"/>
  <rect x="40" y="36" width="8" height="8" fill="#e8b931"/>
</svg>`;

export const sintIcon = L.divIcon({
  className: 'sint-marker',
  html: `<div class="sint-bubble">${mitreSvg}</div>`,
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});

export const homeIcon = L.divIcon({
  className: 'home-marker',
  html: `<div class="home-pin">${houseSvg}</div><div class="home-label">Hier woon jij!</div>`,
  iconSize: [64, 80],
  iconAnchor: [32, 64],
});
