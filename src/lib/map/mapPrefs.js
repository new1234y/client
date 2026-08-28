export const MAPBOX_STYLES = {
  light: {
    id: "light",
    name: "Clair",
    url: "mapbox://styles/mapbox/light-v11",
  },
  dark: {
    id: "dark",
    name: "Sombre",
    url: "mapbox://styles/mapbox/dark-v11",
  },
  streets: {
    id: "streets",
    name: "Rues",
    url: "mapbox://styles/mapbox/streets-v12",
  },
  outdoors: {
    id: "outdoors",
    name: "Stylisé",
    url: "mapbox://styles/mapbox/outdoors-v12",
  },
  satellite: {
    id: "satellite",
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
  },
};

export const MAP_3D_MODES = {
  "2d": { id: "2d", name: "2D" },
  "3d_free": { id: "3d_free", name: "3D déverrouillé" },
  "3d_lock": { id: "3d_lock", name: "3D verrouillé" },
};

export const ACCENTS = {
  blue: { id: "blue", name: "Bleu", swatch: "#2563eb" },
  amber: { id: "amber", name: "Ambre", swatch: "#f59e0b" },
  slate: { id: "slate", name: "Ardoise", swatch: "#475569" },
};

const STYLE_KEY = "chase_gps_map_style";
const STYLE_PICKED_KEY = "chase_gps_map_style_picked";
const D3_KEY = "chase_gps_map_3d";
const D3_MODE_KEY = "chase_gps_map_3d_mode";
const GYRO_KEY = "chase_gps_map_gyro";
const COMPASS_KEY = "chase_gps_compass";
const ACCENT_KEY = "chase_gps_accent";
const HC_KEY = "chase_gps_high_contrast";
const MOTION_KEY = "chase_gps_reduced_motion";

export const MAP_PREF_EVENTS = {
  style: "chase-gps-map-style",
  d3: "chase-gps-map-3d",
  gyro: "chase-gps-map-gyro",
  compass: "chase-gps-compass",
  accent: "chase-gps-accent",
  motion: "chase-gps-reduced-motion",
};

function read(key, fallback = "") {
  try {
    if (typeof window === "undefined") return fallback;
    const v = window.localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function write(key, value, event) {
  try {
    if (typeof window === "undefined") return;
    if (value === "" || value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
    if (event) window.dispatchEvent(new Event(event));
  } catch {
    // ignore
  }
}

export function hasUserPickedMapStyle() {
  return read(STYLE_PICKED_KEY, "0") === "1";
}

export function getMapStyleId(fallback = "light") {
  const stored = read(STYLE_KEY, "");
  if (stored === "3d") return fallback;
  if (stored && MAPBOX_STYLES[stored]) return stored;
  return fallback;
}

export function setMapStyleId(id) {
  const next = MAPBOX_STYLES[id] ? id : "light";
  write(STYLE_KEY, next, MAP_PREF_EVENTS.style);
  write(STYLE_PICKED_KEY, "1", MAP_PREF_EVENTS.style);
}

export function getMap3dMode() {
  const stored = read(D3_MODE_KEY, "");
  if (stored && MAP_3D_MODES[stored]) return stored;
  if (read(D3_KEY, "0") === "1") return "3d_free";
  return "2d";
}

export function setMap3dMode(mode) {
  const next = MAP_3D_MODES[mode] ? mode : "2d";
  write(D3_MODE_KEY, next, MAP_PREF_EVENTS.d3);
  write(D3_KEY, next === "2d" ? "0" : "1", MAP_PREF_EVENTS.d3);
}

export function getMap3d() {
  return getMap3dMode() !== "2d";
}

export function setMap3d(on) {
  setMap3dMode(on ? "3d_free" : "2d");
}

export function getMapGyro() {
  return read(GYRO_KEY, "0") === "1";
}

export function setMapGyro(on) {
  write(GYRO_KEY, on ? "1" : "0", MAP_PREF_EVENTS.gyro);
}

export function getCompassMode() {
  const v = read(COMPASS_KEY, "north");
  return v === "heading" ? "heading" : "north";
}

export function setCompassMode(mode) {
  write(COMPASS_KEY, mode === "heading" ? "heading" : "north", MAP_PREF_EVENTS.compass);
}

export function isMap3dActive() {
  return getMap3dMode() !== "2d";
}

export function resolveMapboxStyleUrl(styleId) {
  return (MAPBOX_STYLES[styleId] || MAPBOX_STYLES.light).url;
}

export function getAccent() {
  const v = read(ACCENT_KEY, "blue");
  if (v === "high-contrast") return "blue";
  return ACCENTS[v] ? v : "blue";
}

export function setAccent(value) {
  const next = ACCENTS[value] ? value : "blue";
  write(ACCENT_KEY, next, MAP_PREF_EVENTS.accent);
}

export function getHighContrast() {
  return read(HC_KEY, "0") === "1" || read(ACCENT_KEY, "") === "high-contrast";
}

export function setHighContrast(on) {
  write(HC_KEY, on ? "1" : "0", MAP_PREF_EVENTS.accent);
}

export function getReducedMotion() {
  try {
    if (typeof window === "undefined") return false;
    if (read(MOTION_KEY, "") === "1") return true;
    if (read(MOTION_KEY, "") === "0") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function setReducedMotion(on) {
  write(MOTION_KEY, on ? "1" : "0", MAP_PREF_EVENTS.motion);
}

export function applyAccentClass(accent = getAccent()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("accent-blue", "accent-amber", "accent-slate", "high-contrast");
  const id = ACCENTS[accent] ? accent : "blue";
  root.classList.add(`accent-${id}`);
  if (getHighContrast()) root.classList.add("high-contrast");
}

export function applyReducedMotionClass(on = getReducedMotion()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (on) root.classList.add("reduce-motion");
  else root.classList.remove("reduce-motion");
}
