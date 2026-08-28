const STORAGE_KEY = "chase_gps_mapbox_token";
const EVENT = "chase-gps-mapbox-token";

function readStoredKey() {
  try {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem(STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

export function getMapboxToken() {
  const stored = readStoredKey().trim();
  if (stored) return stored;
  const fromEnv = import.meta.env?.VITE_MAPBOX_TOKEN;
  return typeof fromEnv === "string" ? fromEnv.trim() : "";
}

export function setMapboxToken(value) {
  const next = String(value ?? "").trim();
  try {
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function hasMapboxToken() {
  return Boolean(getMapboxToken());
}

export const MAPBOX_TOKEN_EVENT = EVENT;
