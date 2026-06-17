import { QRCodeSVG } from "qrcode.react";

export default function QRModal({ sessionId, onClose }) {
  if (!sessionId) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mon QR code"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 text-center">Scan QR code</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 text-center">
          Scannez ce QR code pour m'attraper
        </p>
        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <QRCodeSVG value={sessionId} size={280} level="M" />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-slate-100 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-200"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
