import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export default function QRModal({ sessionId, onClose }) {
  if (!sessionId) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoindre ma session",
          text: `Rejoins ma session avec le code: ${sessionId}`,
          url: window.location.href
        });
      } catch (err) {
        console.error("Erreur lors du partage:", err);
      }
    } else {
      // Fallback: copy to clipboard if share API not available
      navigator.clipboard.writeText(sessionId);
      alert("Code copié dans le presse-papier");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mon QR code"
    >
      <div className="w-full max-w-md rounded-[8px] bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scan QR code</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Scannez ce QR code pour rejoindre la session ou utilisez le code ci-dessous.
        </p>
        <div className="mt-5 flex justify-center">
          <div className="rounded-[8px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
            <QRCodeSVG value={sessionId} size={168} level="M" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <input
            type="text"
            value={sessionId}
            readOnly
            className="flex-1 rounded-[8px] border border-slate-300 bg-slate-50 px-4 py-3 text-center text-lg font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="button"
            onClick={handleShare}
            className="rounded-[8px] bg-[#5B7FA5] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#4A6A8A]"
          >
            Partager
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[8px] bg-slate-200 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
