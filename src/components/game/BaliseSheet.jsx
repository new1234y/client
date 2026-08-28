import { useEffect } from "react";
import { formatDurationMs } from "../../lib/format";
import { remainingMs, useServerNow } from "../../hooks/useServerNow.js";

export default function BaliseSheet({
  balise,
  mySessionId,
  onClose,
  onShowOnMap = null,
}) {
  const now = useServerNow();
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!balise) return null;

  const timeLeft = remainingMs(balise.expiresAt, now);

  const isBeingCaptured = balise.beingCapturedBy !== null;
  const isMyCapture = balise.beingCapturedBy === mySessionId;
  const captureProgress = balise.captureProgress || 0;
  const captureTime = 20 * 1000; // 20 seconds
  const capturePercent = Math.min(100, (captureProgress / captureTime) * 100);

  const handleShowOnMap = () => {
    if (onShowOnMap && balise.lat != null && balise.lng != null) {
      onShowOnMap({ lat: balise.lat, lng: balise.lng });
      onClose();
    }
  };

  return (
    <div
      className="sheet-overlay fixed inset-0 z-[2500] flex items-end justify-center bg-black/55"
      onClick={onClose}
      onTouchEnd={(e) => {
        e.preventDefault();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="sheet-panel w-full max-w-lg rounded-t-3xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
              <svg className="h-8 w-8" viewBox="0 0 24 36" fill="currentColor" aria-hidden="true"><rect x="9" y="10" width="6" height="18" rx="1.2"/><polygon points="12,2 17,10 7,10"/><circle cx="12" cy="12" r="2.2" fill="#fff"/></svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Balise
              </h2>
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                {isBeingCaptured
                  ? isMyCapture
                    ? "En cours de capture par vous"
                    : "En cours de capture"
                  : "Disponible"}
              </p>
              {balise.capturedBy && (
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Capturée
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider dark:text-slate-400">Diamètre</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {Math.round(balise.radiusM * 2)} m
              </p>
            </div>
            <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider dark:text-slate-400">Rayon</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {Math.round(balise.radiusM)} m
              </p>
            </div>
          </div>

          <div className="mt-3 bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wider dark:text-slate-400">Disparition dans</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {timeLeft !== null ? formatDurationMs(timeLeft) : "--:--"}
            </p>
            {timeLeft !== null && timeLeft > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 120000) * 100))}%` }}
                />
              </div>
            )}
          </div>

          {isBeingCaptured && (
            <div className="mt-3 bg-orange-50 rounded-lg p-3 dark:bg-orange-900/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">
                  Progression de capture
                </p>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {Math.round(capturePercent)}%
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-orange-200 dark:bg-orange-800">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${capturePercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                {isMyCapture ? "Continuez à rester dans la zone" : "Un joueur est en train de capturer cette balise"}
              </p>
            </div>
          )}

          {onShowOnMap && (
            <button
              type="button"
              onClick={handleShowOnMap}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Montrer sur la carte
            </button>
          )}
        </div>

        <div className="px-5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="w-full rounded-xl bg-slate-100 py-3.5 text-base font-semibold text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
