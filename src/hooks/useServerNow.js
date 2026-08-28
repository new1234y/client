import { useEffect, useState } from "react";
import { getServerTime } from "../lib/serverTime.js";

const listeners = new Set();
let intervalId = null;
let rafId = null;
let lastEmit = 0;

function emit() {
  const now = getServerTime();
  listeners.forEach((fn) => {
    try {
      fn(now);
    } catch {
      // ignore subscriber errors
    }
  });
}

function loop(ts) {
  if (ts - lastEmit >= 250) {
    lastEmit = ts;
    emit();
  }
  rafId = requestAnimationFrame(loop);
}

function start() {
  if (intervalId || rafId) return;
  if (typeof requestAnimationFrame === "function") {
    rafId = requestAnimationFrame(loop);
  } else {
    intervalId = setInterval(emit, 250);
  }
}

function stop() {
  if (listeners.size > 0) return;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** Shared ~250ms tick so party / zone / balise remaining-time flip together. */
export function useServerNow() {
  const [now, setNow] = useState(() => getServerTime());

  useEffect(() => {
    const fn = (t) => setNow(t);
    listeners.add(fn);
    start();
    fn(getServerTime());
    return () => {
      listeners.delete(fn);
      stop();
    };
  }, []);

  return now;
}

export function remainingSeconds(endsAt, now) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function remainingMs(endsAt, now) {
  if (!endsAt) return null;
  return Math.max(0, endsAt - now);
}
