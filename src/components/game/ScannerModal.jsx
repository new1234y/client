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
   className="fixed inset-0 z-[2000] flex flex-col bg-cozy-text/95 p-3"
   role="dialog"
   aria-modal="true"
   aria-label="Scan capture"
  >
   <div className="flex shrink-0 items-center justify-between pb-2">
    <h2 className="text-lg font-semibold text-cozy-bg">Scan capture</h2>
    <button
     type="button"
     onClick={onClose}
     className="rounded-lg bg-cozy-surface px-4 py-2 text-sm font-medium text-cozy-bg"
    >
     Fermer
    </button>
   </div>

   <div className="shrink-0 rounded-xl border border-white/10 bg-cozy-surface p-4 text-sm leading-relaxed text-cozy-text">
    <p className="font-semibold text-cozy-bg">Votre rôle : chat (traqueur)</p>
    <p className="mt-2 text-cozy-text-secondary">
     Vous ne montrez pas de QR : c&apos;est vous qui scannez celui d&apos;un joueur à proximité pour valider
     sa capture. Cadrez son code dans le cadre jusqu&apos;à la confirmation automatique.
    </p>
   </div>

   {err && (
    <p className="mb-2 mt-3 rounded-lg bg-cozy-red-muted p-3 text-sm text-cozy-red">{err}</p>
   )}

   <div
    id={regionId}
    className="mx-auto mt-3 w-full max-w-md flex-1 overflow-hidden rounded-xl bg-black ring-1 ring-cozy-border"
   />
  </div>
 );
}
