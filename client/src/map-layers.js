import L from 'leaflet';

/**
 * PDOK tile layer that makes PDOK's light-blue water (#ccf2ff) transparent,
 * so the OSM sea underneath shows through as one continuous sea.
 *
 * Done per pixel on a canvas (PDOK sends CORS headers), because SVG url()
 * filters on HTML elements don't work reliably in Safari/iOS.
 * Alpha = A + 6*(R - B): water (R=.8, B=1) -> 0, white land -> 1,
 * orange roads -> clamped to 1.
 */
const WaterCutoutLayer = L.GridLayer.extend({
  initialize(urlTemplate, options) {
    this._urlTemplate = urlTemplate;
    L.GridLayer.prototype.initialize.call(this, options);
  },

  createTile(coords, done) {
    const tile = L.DomUtil.create('canvas', 'leaflet-tile');
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = tile.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size.x, size.y);
      const image = ctx.getImageData(0, 0, size.x, size.y);
      const px = image.data;
      for (let i = 0; i < px.length; i += 4) {
        const alpha = px[i + 3] + 6 * (px[i] - px[i + 2]);
        px[i + 3] = alpha < 0 ? 0 : alpha > 255 ? 255 : alpha;
      }
      ctx.putImageData(image, 0, 0);
      done(null, tile);
    };
    img.onerror = (err) => done(err, tile);
    img.src = L.Util.template(this._urlTemplate, coords);
    return tile;
  },
});

/** Adds the two tile layers: faded OSM underneath, PDOK (NL only) on top. */
export function addBaseLayers(map) {
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
  new WaterCutoutLayer(`https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/${TILE_STYLE}/EPSG:3857/{z}/{x}/{y}.png`, {
    className: 'nl-tiles',
    attribution: 'Kaartgegevens &copy; <a href="https://www.kadaster.nl">Kadaster</a>',
    maxZoom: 19,
  }).addTo(map);
}

export const NL_BOUNDS = L.latLngBounds([50.75, 3.3], [53.55, 7.25]);
