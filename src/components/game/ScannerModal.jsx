import { useCallback, useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ onScan, onClose }) {
  const [err, setErr] = useState(null);
  const scanned = useRef(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (!scanned.current) {
          console.log('[ScannerModal] QR code scanned SUCCESSFULLY:', decodedText);
          scanned.current = true;
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          onScanRef.current?.(decodedText);
        }
      },
      (errorMessage) => {
        // Silently ignore scan errors
      }
    ).catch((err) => {
      console.error('[ScannerModal] Camera start failed:', err);
      setErr("Impossible d'accéder à la caméra");
    });

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
      <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
      
      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-2 right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 ring-2 ring-white/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* QR Code Scanning Area - Transparent */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 border-2 border-vibrant-blue/40 rounded-lg"></div>
          {/* Corner markers - Vibrant Blue */}
          <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-vibrant-blue rounded-tl-lg"></div>
          <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-vibrant-blue rounded-tr-lg"></div>
          <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-vibrant-blue rounded-bl-lg"></div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-vibrant-blue rounded-br-lg"></div>
          {/* Scanning line animation */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div className="w-full h-1 bg-vibrant-blue/60 animate-[scan_2s_ease-in-out_infinite]" style={{ animation: 'scan 2s ease-in-out infinite' }}></div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(248px); }
        }
      `}</style>

      {err && (
        <div className="absolute top-16 left-2 right-2 z-20">
          <p className="rounded-2xl bg-red-950/90 p-3 text-sm text-red-200 backdrop-blur-sm">{err}</p>
        </div>
      )}

      {/* Scanning Instruction */}
      <div className="absolute bottom-4 left-0 right-0 z-10 text-center">
        <p className="text-white/80 text-sm font-medium backdrop-blur-sm bg-black/30 inline-block px-4 py-2 rounded-full">
          Centrez le QR code dans le cadre
        </p>
      </div>
    </div>
  );
}
