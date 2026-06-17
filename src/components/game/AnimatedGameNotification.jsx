import { useEffect, useState } from 'react';

export default function AnimatedGameNotification({ effect, uiNow, onGhostCancel }) {
  const [animationPhase, setAnimationPhase] = useState('circle-expand');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Animation sequence
    const phase1 = setTimeout(() => setAnimationPhase('circle-expand'), 0);
    const phase2 = setTimeout(() => setAnimationPhase('circle-open'), 300);
    const phase3 = setTimeout(() => setAnimationPhase('descend'), 600);
    const phase4 = setTimeout(() => setAnimationPhase('content-expand'), 900);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(phase4);
    };
  }, []);

  if (!effect) return null;

  const getContent = () => {
    if (effect.kind === "noise") {
      const elapsedMs = Math.max(0, uiNow - effect.startedAt);
      const totalMs = Math.max(1, effect.durationSec * 1000);
      const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
      const progress = Math.min(1, elapsedMs / totalMs);
      if (elapsedMs > totalMs) return null;

      const volumeLabel =
        effect.volume === "low" ? "Bas" : effect.volume === "high" ? "Fort" : "Moyen";

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {effect.volume === "high" ? "🔊" : effect.volume === "low" ? "🔈" : "🔉"}
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Bruit fantôme</p>
              <p className="text-xs font-semibold text-blue-700">
                {effect.by} fait vibrer ({volumeLabel})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${Math.max(8, (1 - progress) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{remainingSec}s</span>
          </div>
        </>
      );
    }

    if (effect.kind === "ghost") {
      const total = effect.invisUntil - effect.invisSince;
      const rest = effect.invisUntil - uiNow;
      if (total <= 0 || rest <= 0) return null;
      const progress = 1 - rest / total;
      const remainingSec = Math.max(1, Math.round(rest / 1000));

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👻</span>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Mode ghost actif</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max(6, Math.min(100, progress * 100))}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{remainingSec}s</span>
            {onGhostCancel && (
              <button
                type="button"
                onClick={onGhostCancel}
                className="px-3 py-1 text-xs font-semibold text-blue-600 bg-white rounded-full border border-blue-300 hover:bg-blue-50"
              >
                Visible
              </button>
            )}
          </div>
        </>
      );
    }

    if (effect.kind === "immobilized") {
      const rest = effect.until - uiNow;
      if (rest <= 0) return null;
      const remainingSec = Math.max(1, Math.round(rest / 1000));

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧊</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Immobilisé</p>
              <p className="text-xs font-semibold text-blue-700">Carte gelée — {remainingSec}s restantes</p>
            </div>
          </div>
        </>
      );
    }

    if (effect.kind === "jam") {
      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📡</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Cercle de brouillage</p>
              <p className="text-xs font-semibold text-blue-700">
                Zone {effect.label} — rayon ~{Math.round(effect.radiusM)}m
              </p>
            </div>
          </div>
        </>
      );
    }

    if (effect.kind === "balise_lure") {
      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <p className="text-sm font-semibold text-blue-900">
              Touchez la carte pour placer le leurre
            </p>
          </div>
        </>
      );
    }

    return null;
  };

  const content = getContent();
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none flex items-start justify-center pt-32">
      {/* Circle animation */}
      <div
        className={`relative transition-all duration-300 ease-out ${
          animationPhase === 'circle-expand' ? 'scale-0 opacity-0' :
          animationPhase === 'circle-open' ? 'scale-100 opacity-100' :
          animationPhase === 'descend' ? 'scale-100 opacity-100 translate-y-20' :
          'scale-100 opacity-100 translate-y-24'
        }`}
      >
        {/* Expanding circle */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-2xl transition-all duration-500 ease-out ${
            animationPhase === 'circle-expand' ? 'w-0 h-0' :
            animationPhase === 'circle-open' ? 'w-16 h-16' :
            animationPhase === 'descend' ? 'w-16 h-16' :
            'w-0 h-0'
          }`}
        />

        {/* Content container */}
        <div
          className={`relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border border-blue-200 transition-all duration-500 ease-out overflow-hidden ${
            animationPhase === 'circle-expand' ? 'max-h-0 opacity-0 scale-75' :
            animationPhase === 'circle-open' ? 'max-h-0 opacity-0 scale-75' :
            animationPhase === 'descend' ? 'max-h-0 opacity-0 scale-75' :
            'max-h-40 opacity-100 scale-100'
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
