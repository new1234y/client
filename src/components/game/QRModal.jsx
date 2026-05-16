import { QRCodeSVG } from "qrcode.react";

export default function QRModal({ sessionId, onClose }) {
 if (!sessionId) return null;
 return (
  <div
   className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm backdrop-blur-sm p-4 backdrop-blur-sm"
   role="dialog"
   aria-modal="true"
   aria-label="Mon QR code"
  >
   <div className="w-full max-w-md rounded-xlp-6 shadow-2xl ring-1 ring-cozy-border">
    <h2 className="text-lg font-semibold text-cozy-text">Votre QR de capture</h2>
    <p className="mt-2 text-sm leading-relaxed text-cozy-text-secondary">
     <strong className="text-cozy-text">Rôle joueur :</strong> un chat ouvre « Scan capture »
     sur son téléphone et vise ce code lorsque vous êtes à portée. Vous restez connecté tant que vous ne quittez
     pas la partie.
    </p>
    <div className="mt-5 flex justify-center">
     <div className="rounded-xlp-4 ring-1 ring-cozy-border bg-cozy-surface">
      <QRCodeSVG value={sessionId} size={168} level="M" />
     </div>
    </div>
    <button
     type="button"
     onClick={onClose}
     className="mt-6 w-full rounded-lg bg-cozy-primary py-3.5 text-base font-semibold text-cozy-bg transition hover:bg-cozy-primary-hover"
    >
     Fermer
    </button>
   </div>
  </div>
 );
}
