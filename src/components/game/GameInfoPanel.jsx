import { formatCoins } from '../../lib/format';
import { remainingSeconds, useServerNow } from "../../hooks/useServerNow.js";

export default function GameInfoPanel({
  role,
  isSpectator,
  phaseEndsAt,
  nextBaliseAt,
  baliseExpiresAt,
  currentRadius,
  nextRadius,
  totalPhases,
  currentPhase,
  shrinkZoneEnabled,
  coins,
}) {
  const now = useServerNow();
  const baliseTargetAt = baliseExpiresAt || nextBaliseAt;
  const zoneTimeLeft = remainingSeconds(phaseEndsAt, now);
  const baliseTimeLeft = remainingSeconds(baliseTargetAt, now);

  const formatTime = (seconds) => {
    if (seconds == null) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const roleColor = role === "cat" ? "text-blue-600" : "text-amber-600";
  const roleText = role === "cat" ? "Chat" : role === "player" ? "Souris" : "";

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-xl bg-white/95 px-3 py-2 text-slate-950 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/95 dark:text-white dark:ring-slate-700">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${roleColor}`}>
          {roleText}
          {isSpectator && " · Spectateur"}
        </span>
      </div>

          {coins != null && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.636 5.236a.75.75 0 00-1.061 0 3.5 3.5 0 000 4.95l.707.707a2 2 0 010 2.828l-.707.707a.75.75 0 101.06 1.061l.707-.707a3.5 3.5 0 000-4.95l-.707-.707a2 2 0 010-2.828l.707-.707a.75.75 0 00-1.06-1.061z" />
                  <path d="M12 8a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-slate-600 dark:text-slate-400">Pièces:</span>
              </div>
              <span className="font-mono font-semibold text-slate-950 dark:text-white">{formatCoins(coins)}</span>
            </div>
          )}

      {shrinkZoneEnabled && phaseEndsAt && zoneTimeLeft != null && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400">Zone:</span>
          </div>
          <span className="font-mono font-semibold text-slate-950 dark:text-white">
            {formatTime(zoneTimeLeft)}
          </span>
          {nextRadius && nextRadius !== currentRadius && (
            <span className="text-slate-500 dark:text-slate-400">
              → {Math.round(nextRadius)}m
            </span>
          )}
        </div>
      )}

      {baliseTargetAt && baliseTimeLeft != null && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="text-slate-600 dark:text-slate-400">Balise:</span>
          </div>
          <span className="font-mono font-semibold text-slate-950 dark:text-white">
            {formatTime(baliseTimeLeft)}
          </span>
        </div>
      )}
    </div>
  );
}
