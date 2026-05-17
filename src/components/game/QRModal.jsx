import { QRCodeSVG } from "qrcode.react";

export default function QRModal({ sessionId, onClose }) {
  if (!sessionId) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mon QR code"
    >
      <div className="w-full max-w-md rounded-[8px] bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Votre QR de capture</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">Rôle joueur :</strong> un chat ouvre « Scan capture »
          sur son téléphone et vise ce code lorsque vous êtes à portée. Vous restez connecté tant que vous ne quittez
          pas la partie.
        </p>
        <div className="mt-5 flex justify-center">
          <div className="rounded-[8px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
            <QRCodeSVG value={sessionId} size={168} level="M" />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[8px] bg-[#5B7FA5] py-3.5 text-base font-semibold text-white transition hover:bg-[#4A6A8A]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
