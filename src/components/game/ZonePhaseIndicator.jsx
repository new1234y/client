import { formatDurationMs } from "../../lib/format";
import { remainingSeconds, useServerNow } from "../../hooks/useServerNow.js";

export default function ZonePhaseIndicator({ 
  currentRadius, 
  nextRadius, 
  phaseEndsAt,
  shrinkStartsAt,
  phaseState,
}) {
  const now = useServerNow();
  const timerTarget = phaseState === "waiting" && shrinkStartsAt ? shrinkStartsAt : phaseEndsAt;
  const timeLeft = remainingSeconds(timerTarget, now);

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
    <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-950 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-white">
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
          <div className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white">{formatDurationMs((timeLeft || 0) * 1000)}</div>
          <div className="text-sm font-semibold text-blue-600">Zone rétréci</div>
        </div>
      </div>

      <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />

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
          <div className="absolute text-sm font-semibold text-slate-950 dark:text-white">{percent}%</div>
        </div>
        <div className="text-xs uppercase text-slate-500 dark:text-slate-400">ZONE</div>
      </div>
    </div>
  );
}
