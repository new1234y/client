import { QRCodeSVG } from "qrcode.react";

export default function QRModal({ sessionId, onClose }) {
  if (!sessionId) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mon QR code"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Ma capture
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Montrez ce code à un chat à moins de 15 m pour être capturé.
        </p>
        <div className="flex justify-center rounded-xl bg-white p-4 dark:bg-slate-800">
          <QRCodeSVG value={sessionId} size={220} level="M" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white active:bg-indigo-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
