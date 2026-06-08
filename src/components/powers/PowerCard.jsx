import React, { useState } from "react";

export default function PowerCard({
  title,
  emoji = "✨",
  gradient = ["#EF4444", "#F59E0B"],
  stars = 0,
  costText = "",
  locked = false,
  lockReason = "",
  lockUntil = null,
  onUse,
  children,
  details,
  usageLabel,
}) {
  const [open, setOpen] = useState(false);

  const remaining = lockUntil ? Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000)) : 0;
  const isCurrentlyLocked = locked || remaining > 0;

  return (
    <div 
      className={`relative overflow-hidden rounded-[20px] bg-white p-4 shadow-sm transition-all duration-300 dark:bg-slate-900 ${isCurrentlyLocked ? 'opacity-80 grayscale-[30%]' : ''}`}
      style={{ border: `1.5px solid ${gradient[0]}60` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Pouvoir</span>
            {stars > 0 && (
              <div className="flex items-center text-amber-400/60" title={`Puissance: ${stars}/5`}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < stars ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}>★</span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className="text-[17px] font-extrabold text-slate-900 dark:text-white">{title}</div>
            {usageLabel && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                {usageLabel}
              </span>
            )}
          </div>
          {costText && (
            <div className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              <span className="text-yellow-500 text-base drop-shadow-sm">🪙</span>
              <span className="translate-y-px">{costText}</span>
            </div>
          )}
        </div>
        <div className="select-none text-4xl drop-shadow">{emoji}</div>
      </div>

      <div className="mt-3 relative">
        {children}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isCurrentlyLocked}
            onClick={onUse}
            className={`rounded-full px-5 py-2 text-sm font-bold text-white transition active:scale-[0.96] ${
              isCurrentlyLocked ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed" : "bg-[#1E293B] hover:bg-[#0F172A] dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
            }`}
          >
            {isCurrentlyLocked ? (remaining ? `Attente (${Math.floor(remaining/60)}:${(remaining%60).toString().padStart(2, '0')})` : lockReason || "Indisponible") : "Utiliser"}
          </button>

          {details && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {open ? "Masquer les détails" : "En savoir plus"}
            </button>
          )}
        </div>

        {details && open && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {details}
          </div>
        )}
      </div>

      {isCurrentlyLocked && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/40 backdrop-blur-[2px] dark:bg-slate-900/50 rounded-[20px]">
          <div className="relative z-10 flex flex-col items-center gap-2 transform scale-110">
            <div className="select-none text-5xl drop-shadow-lg">🔒</div>
            <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-800 shadow-lg dark:bg-slate-800/95 dark:text-slate-100">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17a3 3 0 100-6 3 3 0 000 6zm6-7h-1V7a5 5 0 10-10 0v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 0H9V7a3 3 0 016 0v3h-2z"/>
              </svg>
              <span>{remaining ? `${Math.floor(remaining/60)}m ${(remaining%60)}s` : lockReason || "Recharge"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
