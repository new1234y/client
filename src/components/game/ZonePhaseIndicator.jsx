import { useEffect, useState } from "react";

export default function ZonePhaseIndicator({ 
  currentRadius, 
  nextRadius, 
  phaseEndsAt,
  shrinkStartsAt,
  phaseState,
}) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const timerTarget = phaseState === "waiting" && shrinkStartsAt ? shrinkStartsAt : phaseEndsAt;
    if (!timerTarget) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timerTarget - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt, shrinkStartsAt, phaseState]);

  if (!currentRadius) return null;

  const minutes = timeLeft ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft ? timeLeft % 60 : 0;

  // Use whole-game percent when possible (fallback to radius-based percent)
  const percentRadius = currentRadius && nextRadius ? Math.max(0, Math.min(100, Math.round((nextRadius / currentRadius) * 100))) : 100;
  const percent = percentRadius; // keep same semantics for now
  const r = 18;
  const c = Math.PI * 2 * r;
  const dash = (percent / 100) * c;

  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-white border border-slate-300 px-5 py-3 shadow-md">
      {/* Left: clock with blue ring + time */}
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center h-12 w-12">
          <svg className="absolute" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="#EAF2FF" />
            <circle cx="24" cy="24" r="18" fill="none" stroke="#DBEAFE" strokeWidth="3" />
            <circle cx="24" cy="24" r="16" fill="none" stroke="#60A5FA" strokeWidth="4" />
          </svg>
          <svg className="relative h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="9" stroke="#1E3A8A" strokeWidth={0} fill="none" />
          </svg>
        </div>

        <div className="flex flex-col leading-tight">
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
          <div className="text-sm font-semibold text-blue-600">Zone rétréci</div>
        </div>
      </div>

      <div className="h-12 w-px bg-slate-200" />

      {/* Right: circular percent + label */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center h-12 w-12">
          <svg className="-rotate-90" width={48} height={48} viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={r} stroke="#E6EEF9" strokeWidth="6" fill="#FFFFFF" />
            <circle
              cx="24"
              cy="24"
              r={r}
              stroke="#2563EB"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${c - dash}`}
            />
          </svg>
          <div className="absolute text-sm text-slate-900 font-semibold">{percent}%</div>
        </div>
        <div className="text-xs text-slate-500 uppercase">ZONE</div>
      </div>
    </div>
  );
}
