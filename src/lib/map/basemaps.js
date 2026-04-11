/** URLs tuiles (usage conforme aux CGU de chaque fournisseur). */
export const BASEMAPS = {
  osm: {
    name: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    // Thumbnail: Paris area at zoom 12
    thumbnail: "https://a.tile.openstreetmap.org/12/2074/1409.png",
    icon: "map",
  },
  light: {
    name: "Clair",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    thumbnail: "https://a.basemaps.cartocdn.com/light_all/12/2074/1409.png",
    icon: "sun",
  },
  dark: {
    name: "Sombre",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    thumbnail: "https://a.basemaps.cartocdn.com/dark_all/12/2074/1409.png",
    icon: "moon",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "&copy; Esri, Maxar, Earthstar Geographics",
    thumbnail: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1409/2074",
    icon: "satellite",
  },
  terrain: {
    name: "Relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    thumbnail: "https://a.tile.opentopomap.org/12/2074/1409.png",
    icon: "mountain",
  },
};
