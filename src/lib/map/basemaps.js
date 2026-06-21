/** URLs tuiles (usage conforme aux CGU de chaque fournisseur). */
export const BASEMAPS = {
  osm: {
    name: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  // OpenStreetMap tiles are available up to z=19 (provider-dependent); we allow higher map zooms
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
  // Esri World_Imagery usually provides tiles up to z=19 but can vary; keep 19 as native
  maxNativeZoom: 40,
    attribution:
      "&copy; Esri, Maxar, Earthstar Geographics",
  },
};
