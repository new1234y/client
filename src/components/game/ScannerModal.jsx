import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ onScan, onClose }) {
  const [err, setErr] = useState(null);
  const [isStarting, setIsStarting] = useState(true);
  const started = useRef(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const done = useRef(false);
  const reactId = useId().replace(/:/g, "");
  const regionId = `qr-reader-${reactId}`;

  const stopCamera = useCallback(() => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s && started.current) {
      s.stop().catch(() => {});
      started.current = false;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    done.current = false;
    started.current = false;
    setIsStarting(true);
    
    console.log('[ScannerModal] Initializing camera with regionId:', regionId);
    
    const html5 = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = html5;

    const config = { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 };

    let cancelled = false;

    html5
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (cancelled || done.current) return;
          console.log('[ScannerModal] QR code scanned:', decodedText);
          done.current = true;
          onScanRef.current?.(decodedText);
        },
        (errorMessage) => {
          console.log('[ScannerModal] Scan error (expected during operation):', errorMessage);
        }
      )
      .then(() => {
        if (!cancelled) {
          started.current = true;
          setIsStarting(false);
          console.log('[ScannerModal] Camera started successfully');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('[ScannerModal] Camera start failed:', e);
          setIsStarting(false);
          setErr(e?.message || "Impossible d'accéder à la caméra.");
        }
      });

    return () => {
      cancelled = true;
      console.log('[ScannerModal] Cleaning up camera');
      stopCamera();
    };
  }, [regionId, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner QR Code"
      onClick={handleClose}
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 ring-2 ring-white/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Camera View */}
      <div
        id={regionId}
        className="absolute inset-0 w-full h-full bg-black"
      />

      {/* QR Code Scanning Area - Transparent */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-72 h-72">
          <div className="absolute inset-0 border-2 border-vibrant-blue/40 rounded-lg"></div>
          {/* Corner markers - Vibrant Blue */}
          <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-vibrant-blue rounded-tl-lg"></div>
          <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-vibrant-blue rounded-tr-lg"></div>
          <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-vibrant-blue rounded-bl-lg"></div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-vibrant-blue rounded-br-lg"></div>
        </div>
      </div>

      {/* Loading State */}
      {isStarting && !err && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white mx-auto mb-4" />
            <p className="text-white/80 text-sm">Activation de la caméra...</p>
          </div>
        </div>
      )}
      {err && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <p className="rounded-2xl bg-red-950/90 p-3 text-sm text-red-200 backdrop-blur-sm">{err}</p>
        </div>
      )}

      {/* Scanning Instruction */}
      <div className="absolute bottom-8 left-0 right-0 z-10 text-center">
        <p className="text-white/80 text-sm font-medium backdrop-blur-sm bg-black/30 inline-block px-4 py-2 rounded-full">
          Scannez le QR code
        </p>
      </div>
    </div>
  );
}
