import { formatDurationMs } from "../../lib/format";
import { useServerNow } from "../../hooks/useServerNow.js";

export default function ImmobilizedModal({ until, durationSec = 10, by }) {
  const now = useServerNow();
  const remaining = Math.max(0, Number(until) - now);
  if (!until || remaining <= 0) return null;
  const total = Math.max(1000, Number(durationSec) * 1000);
  const progress = Math.max(0, Math.min(100, (remaining / total) * 100));

  return (
    <div className="fixed inset-0 z-[10070] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-live="assertive">
      <div className="w-full max-w-sm rounded-[2rem] border-2 border-cyan-300/60 bg-slate-900 p-7 text-center text-white shadow-[0_0_60px_rgba(34,211,238,.25)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-cyan-300 bg-cyan-400/15 text-cyan-200">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M12 2v20M4.9 6.5 19 17.5M4.9 17.5 19 6.5" />
          </svg>
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Pouvoir actif</p>
        <h2 className="mt-2 text-3xl font-black">Vous êtes immobilisé</h2>
        <p className="mt-2 text-sm text-slate-300">
          La carte et vos déplacements sont temporairement bloqués{by ? ` par ${by}` : ""}.
        </p>
        <p className="mt-6 text-4xl font-black tabular-nums text-cyan-200">{formatDurationMs(remaining)}</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-400">Restez calme, la partie reprend automatiquement.</p>
      </div>
    </div>
  );
}
