import { useCallback, useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { haptic } from "../../lib/haptic.js";

async function boostScreen() {
  const restore = [];
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen().catch(() => {});
      restore.push(async () => {
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      });
    }
  } catch {
    // ignore
  }
  try {
    if ("wakeLock" in navigator) {
      const lock = await navigator.wakeLock.request("screen");
      restore.push(async () => { try { await lock.release(); } catch {} });
    }
  } catch {
    // ignore
  }
  return async () => {
    for (const fn of restore.reverse()) {
      try { await fn(); } catch {}
    }
  };
}

export default function ScannerModal({ onScan, onClose }) {
  const [err, setErr] = useState(null);
  const scanned = useRef(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const restoreRef = useRef(async () => {});
  onScanRef.current = onScan;

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    restoreRef.current?.();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    let cancelled = false;
    boostScreen().then((restore) => {
      if (!cancelled) restoreRef.current = restore;
      else restore();
    });
    return () => {
      cancelled = true;
      restoreRef.current?.();
    };
  }, []);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 12, qrbox: { width: 260, height: 260 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (!scanned.current) {
          scanned.current = true;
          haptic(15);
          onScanRef.current?.(decodedText);
        }
      },
      () => {}
    ).catch(() => {
      setErr("Impossible d'accéder à la caméra");
    });

    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div
      className="sheet-overlay fixed inset-0 z-[2000] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner le QR"
    >
      <div id="qr-reader" className="absolute inset-0 h-full w-full [&>div]:h-full [&>div]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute left-1/2 top-1/2 h-[min(72vw,280px)] w-[min(72vw,280px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/80" />
        <div className="absolute left-1/2 top-1/2 h-[min(72vw,280px)] w-[min(72vw,280px)] -translate-x-1/2 -translate-y-1/2">
          <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-blue-400" />
          <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-blue-400" />
          <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-blue-400" />
          <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-blue-400" />
        </div>
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
