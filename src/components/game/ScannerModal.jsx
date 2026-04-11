import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerModal({ onScan, onClose }) {
  const [err, setErr] = useState(null);
  const started = useRef(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const done = useRef(false);
  const reactId = useId().replace(/:/g, "");
  const regionId = `qr-reader-${reactId}`;

  useEffect(() => {
    done.current = false;
    started.current = false;
    const html5 = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = html5;

    const config = { fps: 8, qrbox: { width: 240, height: 240 } };

    let cancelled = false;

    html5
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (cancelled || done.current) return;
          done.current = true;
          onScanRef.current?.(decodedText);
        },
        () => {}
      )
      .then(() => {
        if (!cancelled) started.current = true;
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e?.message || "Impossible d'accéder à la caméra.");
        }
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && started.current) {
        s.stop().catch(() => {});
      }
    };
  }, [regionId]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col bg-black/95 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner un joueur"
    >
      <div className="flex shrink-0 items-center justify-between pb-2">
        <h2 className="text-lg font-semibold text-white">
          J&apos;ai trouvé un joueur
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white"
        >
          Fermer
        </button>
      </div>
      <p className="mb-2 text-center text-sm text-slate-400">
        Cadrez le QR code de la proie pour valider la capture.
      </p>
      {err && (
        <p className="mb-2 rounded-lg bg-red-950/80 p-3 text-sm text-red-200">
          {err}
        </p>
      )}
      <div
        id={regionId}
        className="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-black"
      />
    </div>
  );
}
