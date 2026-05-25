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
