import L from 'leaflet';

// SVG filter that makes PDOK's light-blue water (#ccf2ff) transparent, so the OSM sea
// underneath shows through as one continuous sea. Alpha = A + 6*(R - B):
// water (R=.8, B=1) -> 0, white land -> 1, orange roads -> clamped to 1.
function ensureWaterFilter() {
  if (document.getElementById('pdok-water-cutout')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <filter id="pdok-water-cutout" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  6 0 -6 1 0" />
      </filter>
    </svg>`);
}

/** Adds the two tile layers: faded OSM underneath, PDOK (NL only) on top. */
export function addBaseLayers(map) {
  ensureWaterFilter();

  // 'strict-origin' sends only our domain as Referer (OSM requires one), never the secret link path.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    className: 'world-tiles',
    referrerPolicy: 'strict-origin',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // PDOK BRT Achtergrondkaart (Kadaster): free, no API key, only covers NL.
  // Styles: 'standaard', 'pastel', 'grijs', 'water'.
  const TILE_STYLE = 'pastel';
  L.tileLayer(`https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/${TILE_STYLE}/EPSG:3857/{z}/{x}/{y}.png`, {
    className: 'nl-tiles',
    attribution: 'Kaartgegevens &copy; <a href="https://www.kadaster.nl">Kadaster</a>',
    maxZoom: 19,
  }).addTo(map);
}

export const NL_BOUNDS = L.latLngBounds([50.75, 3.3], [53.55, 7.25]);
