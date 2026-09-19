import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { haptic } from "../../lib/haptic.js";
import useAnimatedClose from "../../hooks/useAnimatedClose.js";

let cameraQueue = Promise.resolve();

function enqueueCamera(task) {
  const run = cameraQueue.then(task, task);
  cameraQueue = run.then(() => undefined, () => undefined);
  return run;
}

export default function ScannerModal({ onScan, onClose }) {
  const { leaving, requestClose, onExitAnimationEnd } = useAnimatedClose(onClose);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState(null);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const closeScanner = useCallback(() => {
    scannedRef.current = true;
    enqueueCamera(async () => {
      stopCamera();
      requestClose();
    });
  }, [requestClose, stopCamera]);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    enqueueCamera(async () => {
      if (cancelled || !videoRef.current) return;
      try {
        controlsRef.current = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          },
          videoRef.current,
          (result, decodeError) => {
            if (cancelled || scannedRef.current) return;
            if (result) {
              scannedRef.current = true;
              haptic(15);
              stopCamera();
              onScanRef.current?.(result.getText());
              onCloseRef.current?.();
            } else if (decodeError?.name === "NotAllowedError") {
              setError("Autorisez l’accès à la caméra pour scanner le QR.");
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.name === "NotAllowedError"
              ? "Autorisez l’accès à la caméra pour scanner le QR."
              : "La caméra n’est pas disponible sur cet appareil."
          );
        }
      }
    });

    return () => {
      cancelled = true;
      enqueueCamera(async () => {
        stopCamera();
        reader.reset();
      });
    };
  }, [stopCamera]);

  return (
    <div
      className={`sheet-overlay fixed inset-0 z-[2000] flex flex-col bg-black${leaving ? " is-leaving" : ""}`}
      onAnimationEnd={onExitAnimationEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Scanner le QR"
    >
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="min-h-0 flex-1 bg-black/55" />
        <div className="flex">
          <div className="min-w-0 flex-1 bg-black/55" />
          <div className="relative h-[min(68vmin,320px)] w-[min(68vmin,320px)] shrink-0 rounded-3xl border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(0,0,0,.55)]">
            <span className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-white" />
            <span className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-white" />
            <span className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-white" />
            <span className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-white" />
          </div>
          <div className="min-w-0 flex-1 bg-black/55" />
        </div>
        <div className="min-h-0 flex-1 bg-black/55" />
      </div>
      <p className="absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-10 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs font-black uppercase tracking-widest text-white backdrop-blur-sm">
        Scanner le QR
      </p>
      {error && <p role="alert" className="absolute left-3 right-3 top-20 z-20 rounded-2xl bg-red-950/90 p-3 text-center text-sm font-semibold text-red-100">{error}</p>}
      <p className="absolute bottom-28 left-0 right-0 z-10 text-center text-sm font-semibold text-white/90">Placez le QR dans le cadre.</p>
      <button type="button" onClick={closeScanner} className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-10 min-h-12 w-[min(92%,20rem)] -translate-x-1/2 rounded-full bg-white px-6 text-base font-black text-slate-950">
        Fermer
      </button>
    </div>
  );
}
