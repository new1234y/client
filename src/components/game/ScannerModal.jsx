import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { haptic } from "../../lib/haptic.js";

/** Serialize camera start/stop so Strict Mode remounts and fast reopen cannot overlap. */
let cameraQueue = Promise.resolve();

function enqueueCamera(task) {
  const run = cameraQueue.then(task, task);
  cameraQueue = run.then(() => undefined, () => undefined);
  return run;
}

function qrBoxSize() {
  const side = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.55);
  return Math.max(120, Math.min(side, 280));
}

async function canUseBarcodeDetector() {
  if (typeof window === "undefined" || typeof window.BarcodeDetector !== "function") {
    return false;
  }
  try {
    if (typeof window.BarcodeDetector.getSupportedFormats === "function") {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (Array.isArray(formats) && formats.length && !formats.includes("qr_code")) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function waitForElement(id, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      const el = document.getElementById(id);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - t0 > timeoutMs) {
        reject(new Error("qr host missing"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * Native getUserMedia + BarcodeDetector, else html5-qrcode.
 * Never calls requestFullscreen — that combo hard-crashes iOS Safari / some Chromium.
 */
async function startScanner({ cancelled, readerId, videoEl, onDecoded, onError, setRelease }) {
  const resources = {
    stream: null,
    scanner: null,
    raf: 0,
  };

  let releasing = null;
  const release = () => {
    if (releasing) return releasing;
    releasing = (async () => {
      if (resources.raf) {
        cancelAnimationFrame(resources.raf);
        resources.raf = 0;
      }
      const stream = resources.stream;
      resources.stream = null;
      if (stream) {
        for (const track of stream.getTracks()) {
          try { track.stop(); } catch { /* ignore */ }
        }
      }
      if (videoEl) {
        try { videoEl.srcObject = null; } catch { /* ignore */ }
      }
      const scanner = resources.scanner;
      resources.scanner = null;
      if (scanner) {
        try { await scanner.stop(); } catch { /* ignore */ }
        try { await scanner.clear(); } catch { /* ignore */ }
      }
    })();
    return releasing;
  };

  setRelease(release);

  const startNative = async () => {
    if (!(await canUseBarcodeDetector()) || !videoEl || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
    } catch {
      return false;
    }
    if (cancelled() || !videoEl) {
      stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
      return true;
    }
    resources.stream = stream;
    videoEl.srcObject = stream;
    videoEl.setAttribute("playsinline", "true");
    videoEl.setAttribute("webkit-playsinline", "true");
    videoEl.muted = true;
    videoEl.autoplay = true;
    try {
      await videoEl.play();
    } catch {
      await release();
      return false;
    }
    if (cancelled()) {
      await release();
      return true;
    }

    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      await release();
      return false;
    }
    const intervalMs = 1000 / 8;
    let lastTs = 0;
    let inFlight = false;

    const loop = (ts) => {
      if (cancelled()) return;
      resources.raf = requestAnimationFrame(loop);
      if (inFlight || ts - lastTs < intervalMs) return;
      lastTs = ts;
      if (videoEl.readyState < 2) return;
      inFlight = true;
      detector.detect(videoEl).then((codes) => {
        inFlight = false;
        if (cancelled()) return;
        const value = codes?.[0]?.rawValue;
        if (value) onDecoded(value);
      }).catch(() => {
        inFlight = false;
      });
    };
    resources.raf = requestAnimationFrame(loop);
    return true;
  };

  const startHtml5 = async () => {
    try {
      await waitForElement(readerId);
    } catch {
      onError("Impossible d'accéder à la caméra");
      return;
    }
    if (cancelled()) return;
    const scanner = new Html5Qrcode(readerId, { verbose: false });
    resources.scanner = scanner;
    const side = qrBoxSize();
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: side, height: side }, disableFlip: false },
        (decodedText) => { onDecoded(decodedText); },
        () => {}
      );
      if (cancelled()) {
        await release();
      }
    } catch {
      resources.scanner = null;
      try { await scanner.stop(); } catch { /* ignore */ }
      try { await scanner.clear(); } catch { /* ignore */ }
      if (!cancelled()) onError("Impossible d'accéder à la caméra");
    }
  };

  if (cancelled()) return release;

  const native = await startNative();
  if (!native && !cancelled()) {
    await startHtml5();
  }
  return release;
}

export default function ScannerModal({ onScan, onClose }) {
  const reactId = useId().replace(/:/g, "");
  const readerId = `qr-reader-${reactId || "x"}`;
  const [err, setErr] = useState(null);
  const videoRef = useRef(null);
  const scanned = useRef(false);
  const releaseRef = useRef(async () => {});
  const wakeLockRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopThen = useCallback((after) => {
    scanned.current = true;
    enqueueCamera(async () => {
      try {
        await releaseRef.current?.();
      } catch { /* ignore */ }
      releaseRef.current = async () => {};
      after?.();
    });
  }, []);

  const handleClose = useCallback(() => {
    stopThen(() => onCloseRef.current?.());
  }, [stopThen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!("wakeLock" in navigator) || typeof navigator.wakeLock?.request !== "function") return;
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        // optional — never fullscreen
      }
    })();
    return () => {
      cancelled = true;
      const lock = wakeLockRef.current;
      wakeLockRef.current = null;
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cancelledFn = () => cancelled || scanned.current;

    const started = enqueueCamera(async () => {
      if (cancelledFn()) return;
      await startScanner({
        cancelled: cancelledFn,
        readerId,
        videoEl: videoRef.current,
        setRelease: (fn) => { releaseRef.current = fn; },
        onDecoded: (text) => {
          if (scanned.current || cancelled) return;
          scanned.current = true;
          haptic(15);
          stopThen(() => {
            onScanRef.current?.(text);
            onCloseRef.current?.();
          });
        },
        onError: (message) => {
          if (!cancelled) setErr(message);
        },
      });
      if (cancelled) {
        try { await releaseRef.current?.(); } catch { /* ignore */ }
        releaseRef.current = async () => {};
      }
    });

    return () => {
      cancelled = true;
      enqueueCamera(async () => {
        await started.catch(() => {});
        try {
          await releaseRef.current?.();
        } catch { /* ignore */ }
        releaseRef.current = async () => {};
      });
    };
  }, [readerId, stopThen]);

  return (
    <div
      className="sheet-overlay fixed inset-0 z-[2000] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner le QR"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <div
        id={readerId}
        className="absolute inset-0 h-full w-full [&>div]:h-full [&>div]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="min-h-0 flex-1 bg-black/55" />
        <div className="flex">
          <div className="min-w-0 flex-1 bg-black/55" />
          <div className="relative h-[min(55vmin,280px)] w-[min(55vmin,280px)] shrink-0">
            <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-blue-400" />
            <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-blue-400" />
            <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-blue-400" />
            <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-3xl border-b-4 border-l-4 border-blue-400" />
          </div>
          <div className="min-w-0 flex-1 bg-black/55" />
        </div>
        <div className="min-h-0 flex-1 bg-black/55" />
      </div>

      <p className="absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-10 -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-xs font-black uppercase tracking-widest text-white backdrop-blur-sm">
        Scanner le QR
      </p>

      {err && (
        <div className="absolute top-20 left-3 right-3 z-20">
          <p className="rounded-2xl bg-red-950/90 p-3 text-sm text-red-200">{err}</p>
        </div>
      )}

      <p className="absolute bottom-28 left-0 right-0 z-10 text-center text-sm font-semibold text-white/90">
        Cadrez le QR : la capture est validée.
      </p>

      <button
        type="button"
        onClick={handleClose}
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-10 min-h-12 w-[min(92%,20rem)] -translate-x-1/2 rounded-full bg-white px-6 text-base font-black text-slate-950"
      >
        Fermer
      </button>
    </div>
  );
}
