const STORAGE_KEY = "chase_gps_osm_api_key";

function readStoredKey() {
  try {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem(STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

export function getOsmApiKey() {
  const stored = readStoredKey().trim();
  if (stored) return stored;
  const fromEnv = import.meta.env?.VITE_OSM_API_KEY;
  return typeof fromEnv === "string" ? fromEnv.trim() : "";
}

export function setOsmApiKey(value) {
  const next = String(value ?? "").trim();
  try {
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("chase-gps-osm-key"));
  } catch {
    // ignore quota / private mode
  }
}

export function hasOsmApiKey() {
  return Boolean(getOsmApiKey());
}
