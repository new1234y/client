import { useEffect, useState } from "react";

export default function GameInfoPanel({
  role,
  isSpectator,
  phaseEndsAt,
  nextBaliseAt,
  currentRadius,
  nextRadius,
  totalPhases,
  currentPhase,
  shrinkZoneEnabled,
  coins,
}) {
  const [zoneTimeLeft, setZoneTimeLeft] = useState(null);
  const [baliseTimeLeft, setBaliseTimeLeft] = useState(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      setZoneTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setZoneTimeLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  useEffect(() => {
    if (!nextBaliseAt) {
      setBaliseTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((nextBaliseAt - Date.now()) / 1000));
      setBaliseTimeLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextBaliseAt]);

  const formatTime = (seconds) => {
    if (seconds == null) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const roleColor = role === "cat" ? "text-[#C45454]" : "text-[#5B7FA5]";
  const roleText = role === "cat" ? "Chat" : role === "player" ? "Joueur" : "";

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/95 dark:ring-slate-700">
      {/* Role */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${roleColor}`}>
          {roleText}
          {isSpectator && " · Spectateur"}
        </span>
      </div>

      {/* Coins */}
      {coins != null && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.636 5.236a.75.75 0 00-1.061 0 3.5 3.5 0 000 4.95l.707.707a2 2 0 010 2.828l-.707.707a.75.75 0 101.06 1.061l.707-.707a3.5 3.5 0 000-4.95l-.707-.707a2 2 0 010-2.828l.707-.707a.75.75 0 00-1.06-1.061z" />
              <path d="M12 8a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-slate-600 dark:text-slate-400">Pièces:</span>
          </div>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {coins}
          </span>
        </div>
      )}

      {/* Zone timer */}
      {shrinkZoneEnabled && phaseEndsAt && zoneTimeLeft != null && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400">Zone:</span>
          </div>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatTime(zoneTimeLeft)}
          </span>
          {nextRadius && nextRadius !== currentRadius && (
            <span className="text-slate-500 dark:text-slate-400">
              → {Math.round(nextRadius)}m
            </span>
          )}
        </div>
      )}

      {/* Balise timer */}
      {nextBaliseAt && baliseTimeLeft != null && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="text-slate-600 dark:text-slate-400">Balise:</span>
          </div>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatTime(baliseTimeLeft)}
          </span>
        </div>
      )}
    </div>
  );
}
