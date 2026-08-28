import React, { useState } from "react";
import { remainingSeconds, useServerNow } from "../../hooks/useServerNow.js";
import Button from "../ui/Button.jsx";
import { formatDurationMs, formatCoins } from '../../lib/format';

function PowerGlyph({ title, emoji }) {
  const t = String(title || "").toLowerCase();
  let name = "bolt";
  if (/invisib|ghost/.test(t) || emoji === "👻") name = "ghost";
  else if (/bruit|noise/.test(t) || emoji === "🔊") name = "sound";
  else if (/immobil|gel|freeze/.test(t) || emoji === "🧊") name = "freeze";
  else if (/leurre|balise|fake/.test(t) || emoji === "🎯" || emoji === "🎭") name = "target";
  else if (/zone|morph/.test(t) || emoji === "📡") name = "radar";

  const paths = {
    ghost: <><circle cx="12" cy="10" r="4"/><path d="M8 14c-2 2-3 4-3 6h14c0-2-1-4-3-6"/><path d="M10 10h.01M14 10h.01"/></>,
    sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></>,
    freeze: <path d="M12 2v20M4.9 6.5 19 17.5M4.9 17.5 19 6.5"/>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
    radar: <><circle cx="12" cy="12" r="8"/><path d="M12 12 16 8"/><circle cx="12" cy="12" r="3"/></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
  };
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths[name]}
      </svg>
    </span>
  );
}

export default function PowerCard({
  title,
  emoji = "✨",
  gradient = ["#2563EB", "#F59E0B"],
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

  const now = useServerNow();
  const remaining = remainingSeconds(lockUntil, now) || 0;
  const isCurrentlyLocked = locked || remaining > 0;
  const isButtonDisabled = isCurrentlyLocked || insufficientCoins;
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950 ${isCurrentlyLocked ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <PowerGlyph title={title} emoji={emoji} />
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pouvoir
              </div>
              <div className="text-lg font-black text-slate-950 dark:text-white">{title}</div>
            </div>
          </div>
      {costText && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
        <span>{typeof costText === 'number' ? formatCoins(costText) : costText}</span>
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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="power"
            disabled={isButtonDisabled}
            onClick={onUse}
            className="min-h-11 flex-1"
          >
            {isButtonDisabled ? (
              insufficientCoins ? `Pas assez de pièces (${typeof estimatedCost === 'number' ? formatCoins(estimatedCost) : estimatedCost})` : remaining ? `Attente (${formatDurationMs(remaining*1000)})` : lockReason || "Indisponible"
            ) : "Utiliser"}
          </Button>

          {details && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {open ? "Moins" : "Plus"}
            </button>
          )}
        </div>

        {details && open && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {details}
          </div>
        )}
      </div>

      {isCurrentlyLocked && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-slate-950/60 rounded-[2rem]">
          <div className="relative z-10 flex flex-col items-center gap-3">
            <svg className="h-10 w-10 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 17a3 3 0 100-6 3 3 0 000 6zm6-7h-1V7a5 5 0 10-10 0v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 0H9V7a3 3 0 016 0v3h-2z"/>
            </svg>
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100">
              <span>{remaining ? formatDurationMs(remaining*1000) : lockReason || "Recharge"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
