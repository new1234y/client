import { QRCodeSVG } from "qrcode.react";
import { useCallback } from "react";

export default function QRModal({ sessionId, onClose }) {
  if (!sessionId) return null;

  const handleShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Code de partie",
        text: `Rejoins la partie avec le code : ${sessionId}`,
        url:
          typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}?session=${encodeURIComponent(sessionId)}`
            : "",
      });
    } catch {
      /* user cancelled */
    }
  }, [sessionId]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mon QR code"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        {/* Title */}
        <h2 className="text-center text-xl font-bold text-slate-900 dark:text-white">
          Scan QR code
        </h2>

        {/* Subtitle */}
        <p className="mx-auto mt-2 max-w-[260px] text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Montrez ce code au joueur chat pour qu&apos;il puisse scanner votre QR de capture.
        </p>

        {/* QR Code */}
        <div className="mt-5 flex justify-center">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
            <QRCodeSVG value={sessionId} size={180} level="M" />
          </div>
        </div>

        {/* Divider */}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
            ou entrez le code manuellement
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Code field + share button */}
        <div className="mt-4 flex items-stretch gap-2">
          <div className="flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <span className="select-all font-mono text-base font-bold tracking-widest text-slate-900 dark:text-white">
              {sessionId}
            </span>
          </div>
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager"
              className="flex items-center justify-center rounded-full bg-[#5B7FA5] px-4 text-white transition-colors hover:bg-[#4A6A8A]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-[#C45454] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#B04A4A]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
