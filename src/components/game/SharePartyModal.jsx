import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";

export default function SharePartyModal({ code, title, onClose }) {
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(code || "")}`
      : "";

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Rejoindre ma partie",
          text: `Rejoins ma partie avec le code : ${code}`,
          url: joinUrl,
        });
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    }
  }, [joinUrl, code, title]);

  if (!code) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Partager la partie"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center text-lg font-bold text-slate-900">
          Scanner le QR code
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Montrez ce code pour inviter des joueurs à rejoindre votre partie.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl bg-white p-4 ring-2 ring-vibrant-blue/20">
            <QRCodeSVG value={joinUrl} size={180} level="M" />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="text-xs font-medium text-slate-500">
            ou entrez le code manuellement
          </span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-mono text-2xl font-bold tracking-[0.2em] text-vibrant-blue">
              {code}
            </p>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant-blue text-white shadow-lg transition-transform active:scale-95"
            aria-label="Partager"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
