import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";
import Button from "../ui/Button.jsx";

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
      <div className="w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/50 dark:bg-slate-900/90 dark:ring-slate-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center text-xl font-bold text-slate-900">
          Scanner le QR code
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Montrez ce code pour inviter des joueurs à rejoindre votre partie.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="rounded-3xl bg-white p-6 ring-2 ring-blue-500/20 shadow-lg">
            <QRCodeSVG value={joinUrl} size={200} level="M" />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="text-xs font-semibold text-slate-600">
            ou entrez le code manuellement
          </span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-3xl border-2 border-slate-200 bg-slate-50 px-4 py-4">
            <p className="font-mono text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {code}
            </p>
          </div>
          <Button
            variant="primaryGradient"
            onClick={handleShare}
            className="h-14 w-14 flex-shrink-0"
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
          </Button>
        </div>

        <Button
          variant="secondary"
          className="mt-6 w-full"
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}
