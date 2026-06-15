import { useEffect } from "react";

function roleBadgeText(p) {
  if (p.spectator) return "Spectateur";
  if (p.role === "cat" && p.originalRole === "player") return "Chat (devenu chat)";
  if (p.role === "cat") return "Chat";
  if (p.role === "player" && p.originalRole === "cat") return "Joueur (ex-chat)";
  return "Joueur";
}

export default function PlayerSheet({
  player,
  onClose,
  onShowOnMap = null,
  mapFocus = null,
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!player) return null;

  const roleColor =
    player.role === "cat"
      ? "text-[#C45454] dark:text-[#D47070]"
      : "text-[#5B7FA5] dark:text-[#7B9BB8]";

  const isDisconnected = player.disconnected;
  const canShowOnMap =
    mapFocus?.type === "exact" || mapFocus?.type === "circle";
  const isGhostHidden = mapFocus?.type === "hidden";

  const handleShowOnMap = () => {
    if (canShowOnMap && onShowOnMap) {
      onShowOnMap(mapFocus);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800">
              {player.role === "cat" ? "🐱" : "🏃"}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {player.nickname}
              </h2>
              <p className={`text-sm font-medium ${roleColor}`}>{roleBadgeText(player)}</p>
              {player.coins !== undefined && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-yellow-500">🪙</span>
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {player.coins}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${isDisconnected ? "bg-red-500" : "bg-emerald-500"}`}
                />
                <p
                  className={`text-xs ${isDisconnected ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"}`}
                >
                  {isDisconnected ? "Déconnecté" : "En ligne"}
                </p>
                {player.invisible && (
                  <span className="text-xs text-violet-500">· Ghost 👻</span>
                )}
              </div>
            </div>
          </div>

          {canShowOnMap && onShowOnMap && (
            <button
              type="button"
              onClick={handleShowOnMap}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B7FA5] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4A6A8A] active:scale-[0.98]"
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
              {mapFocus?.type === "circle" && (
                <span className="text-[10px] opacity-80">(zone approx.)</span>
              )}
            </button>
          )}

          {isGhostHidden && (
            <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-center text-sm text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              Ce joueur est en mode ghost — introuvable sur la carte
            </div>
          )}

          {!canShowOnMap && !isGhostHidden && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              Position GPS non reçue — impossible d&apos;afficher sur la carte
            </div>
          )}
        </div>

        <div className="px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 py-3.5 text-base font-semibold text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
