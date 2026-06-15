const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

function healthUrls() {
  const urls = [`${SOCKET_URL.replace(/\/$/, "")}/health`];
  if (import.meta.env.DEV) urls.push("/health");
  return [...new Set(urls)];
}

/** Ping backend to wake cold-hosted server before socket actions. */
export async function wakeBackend({ timeoutMs = 20000, retries = 4 } = {}) {
  const urls = healthUrls();
  let lastErr = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const url of urls) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(timer);
        if (res.ok) return true;
        lastErr = new Error(`health ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr || new Error("backend_unreachable");
}

/** Wake backend then ensure socket is connected (with timeout). */
export async function ensureSocketReady(socket, { wake = true } = {}) {
  if (!socket) throw new Error("no_socket");
  if (wake) {
    try {
      await wakeBackend();
    } catch {
      // Still try socket — wake may fail on same-origin proxy setups
    }
  }
  if (socket.connected) return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      reject(new Error("socket_timeout"));
    }, 20000);

    const onConnect = () => {
      clearTimeout(timeout);
      socket.off("connect_error", onError);
      resolve();
    };
    const onError = () => {
      clearTimeout(timeout);
      socket.off("connect", onConnect);
      reject(new Error("socket_connect_error"));
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
    socket.connect();
  });
}
