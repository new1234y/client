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
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-2 ring-white/30 dark:bg-slate-900 dark:ring-slate-600">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 justify-center">
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
              <QRCodeSVG value={sessionId} size={160} level="M" />
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Ma capture
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Montrez ce code à un chat à moins de 15 m pour être capturé.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white active:bg-indigo-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
