import { useEffect, useState } from "react";

export default function ZonePhaseIndicator({ 
  currentRadius, 
  nextRadius, 
  phaseEndsAt,
  totalPhases = 5,
  currentPhase = 1,
}) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  if (!currentRadius) return null;

  const minutes = timeLeft ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft ? timeLeft % 60 : 0;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900/95 px-3 py-2 shadow-lg ring-1 ring-slate-700 backdrop-blur">
      {/* Phase indicator dots */}
      <div className="flex gap-1">
        {Array.from({ length: totalPhases }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i < currentPhase
                ? "bg-indigo-500"
                : i === currentPhase
                  ? "animate-pulse bg-indigo-400"
                  : "bg-slate-600"
            }`}
          />
        ))}
      </div>

      <div className="h-4 w-px bg-slate-700" />

      {/* Current zone info */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="text-slate-400">{Math.round(currentRadius)}m</span>
        </div>
        
        {nextRadius && nextRadius !== currentRadius && (
          <>
            <svg className="h-3 w-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full border border-orange-500 bg-transparent" />
              <span className="text-orange-400">{Math.round(nextRadius)}m</span>
            </div>
          </>
        )}
      </div>

      {/* Time until next phase */}
      {timeLeft != null && timeLeft > 0 && (
        <>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1 text-xs">
            <svg className="h-3 w-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-white">
              {minutes}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
