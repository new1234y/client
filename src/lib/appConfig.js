const PRODUCTION_URL = "https://chatgame2026.vercel.app";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export function getPublicBaseUrl() {
  if (import.meta.env.VITE_PUBLIC_URL) {
    return import.meta.env.VITE_PUBLIC_URL.replace(/\/$/, "");
  }
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return window.location.origin;
  }
  return PRODUCTION_URL;
}

export function getPublicUrl(path = "") {
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, "")}` : "";
  return `${getPublicBaseUrl()}${normalizedPath}`;
}
