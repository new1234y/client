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
  insufficientCoins = false,
  estimatedCost = null,
  onUse,
  children,
  details,
  usageLabel,
}) {
  const [open, setOpen] = useState(false);

  const remaining = lockUntil ? Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000)) : 0;
  const isCurrentlyLocked = locked || remaining > 0;
  const isButtonDisabled = isCurrentlyLocked || insufficientCoins;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg transition-all duration-300 dark:bg-slate-900 ${isCurrentlyLocked ? 'opacity-70 grayscale-[40%]' : ''}`}
      style={{ border: `2px solid ${gradient[0]}40` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-4xl drop-shadow-lg">{emoji}</div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pouvoir
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">{title}</div>
            </div>
          </div>
          {costText && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1.5 text-sm font-bold text-amber-700 ring-1 ring-amber-200 dark:from-amber-900/30 dark:to-yellow-900/30 dark:text-amber-300 dark:ring-amber-700">
              <span className="text-base">🪙</span>
              <span>{costText}</span>
            </div>
          )}
          {stars > 0 && (
            <div className="mt-2 flex items-center gap-0.5" title={`Puissance: ${stars}/5`}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-sm ${i < stars ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}`}>★</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 relative">
        {children}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isButtonDisabled}
            onClick={onUse}
            className={`flex-1 rounded-xl px-5 py-3 text-sm font-bold text-white transition active:scale-[0.96] ${
              isButtonDisabled
                ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30"
            }`}
          >
            {isButtonDisabled ? (insufficientCoins ? `Pas assez de pièces (${estimatedCost})` : remaining ? `Attente (${Math.floor(remaining/60)}:${(remaining%60).toString().padStart(2, '0')})` : lockReason || "Indisponible") : "Utiliser"}
          </button>

          {details && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-xl px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {open ? "Moins" : "Plus"}
            </button>
          )}
        </div>

        {details && open && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {details}
          </div>
        )}
      </div>

      {isCurrentlyLocked && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-slate-900/60 rounded-2xl">
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="select-none text-5xl drop-shadow-lg">🔒</div>
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-lg dark:bg-slate-800 dark:text-slate-100">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
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
