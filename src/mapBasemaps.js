/** URLs tuiles (usage conforme aux CGU de chaque fournisseur). */
export const BASEMAPS = {
  osm: {
    name: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 40,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  light: {
    name: "Clair",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    maxNativeZoom: 40,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    name: "Sombre",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    maxNativeZoom: 40,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxNativeZoom: 40,
    attribution:
      "&copy; Esri, Maxar, Earthstar Geographics",
  },
};

const CARTO_IDS = new Set(["light", "dark"]);

function withApiKey(url, key) {
  if (!key) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}apikey=${encodeURIComponent(key)}`;
}

/** Resolved tile URL. Carto light/dark fall back to OSM when no key is present. */
export function tileUrl(id, key) {
  if (CARTO_IDS.has(id) && !key) {
    return BASEMAPS.osm.url;
  }
  const bm = BASEMAPS[id] || BASEMAPS.osm;
  if (CARTO_IDS.has(id) && key) {
    return withApiKey(bm.url, key);
  }
  return bm.url;
}

export function resolveBasemap(id, key) {
  const useOsmFallback = CARTO_IDS.has(id) && !key;
  const bm = useOsmFallback ? BASEMAPS.osm : (BASEMAPS[id] || BASEMAPS.osm);
  return {
    ...bm,
    url: tileUrl(id, key),
  };
}
