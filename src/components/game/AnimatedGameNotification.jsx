import { useState, useEffect, useRef } from 'react';

function AnimatedGameNotification({ effect, uiNow, onGhostCancel }) {
  // Gestion de l'état de l'animation : 'hidden' | 'entering' | 'exiting'
  const [animationState, setAnimationState] = useState('hidden');
  const effectRef = useRef(null);
  const prevJamLabelRef = useRef(null);

  const buildEffectKey = (ef) => {
    if (!ef) return 'none';
    const makeKey = (e) => {
      if (!e) return 'empty';
      switch (e.kind) {
        case 'noise':
          return `noise:${e.volume || ''}:${e.startedAt || ''}:${e.durationSec || ''}:${e.by || ''}`;
        case 'ghost':
          return `ghost:${e.invisSince || ''}:${e.invisUntil || ''}:${e.by || ''}`;
        case 'immobilized':
          return `immobilized:${e.until || ''}`;
        case 'jam':
          return `jam:${e.label || ''}`;
        case 'balise_lure':
          return `balise_lure:${e.id || e.lat || e.lng || ''}`;
        case 'balise_capture':
          return `balise_capture:${e.baliseId || ''}:${e.nickname || ''}:${e.isMyCapture || ''}`;
        case 'fake_position':
          return `fake_position:${e.until || ''}`;
        case 'join_request':
          return `join_request:${e.nickname || ''}:${e.requestId || ''}`;
        default:
          try {
            const clone = {};
            Object.keys(e).forEach(k => {
              const v = e[k];
              if (typeof v !== 'function' && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
                clone[k] = v;
              }
            });
            return `${e.kind}:${JSON.stringify(clone)}`;
          } catch (err) {
            return String(e.kind);
          }
      }
    };

    if (Array.isArray(ef)) {
      return ef.map(makeKey).join('|');
    }
    return makeKey(ef);
  };

  const effectKey = buildEffectKey(effect);

  // Helper function to determine notification duration based on type
  const getNotificationDuration = (ef) => {
    if (!ef) return 2000;

    const effects = Array.isArray(ef) ? ef : [ef];
    
    // Check if any effect is a timer/progress notification (should stay until completion)
    const hasTimerEffect = effects.some(e => {
      if (e.kind === 'noise') {
        const elapsedMs = Math.max(0, uiNow - e.startedAt);
        const totalMs = Math.max(1, e.durationSec * 1000);
        return (totalMs - elapsedMs) > 0;
      }
      if (e.kind === 'ghost') {
        const rest = e.invisUntil - uiNow;
        return rest > 0;
      }
      if (e.kind === 'immobilized') {
        const rest = e.until - uiNow;
        return rest > 0;
      }
      if (e.kind === 'balise_capture') {
        const captureTime = 30 * 1000;
        const elapsedMs = e.captureProgress || 0;
        return (captureTime - elapsedMs) > 0;
      }
      return false;
    });

    if (hasTimerEffect) {
      // For timer notifications, calculate the maximum remaining time
      let maxRemaining = 0;
      effects.forEach(e => {
        if (e.kind === 'noise') {
          const elapsedMs = Math.max(0, uiNow - e.startedAt);
          const totalMs = Math.max(1, e.durationSec * 1000);
          const remaining = totalMs - elapsedMs;
          maxRemaining = Math.max(maxRemaining, remaining);
        }
        if (e.kind === 'ghost') {
          const rest = e.invisUntil - uiNow;
          maxRemaining = Math.max(maxRemaining, rest);
        }
        if (e.kind === 'immobilized') {
          const rest = e.until - uiNow;
          maxRemaining = Math.max(maxRemaining, rest);
        }
        if (e.kind === 'balise_capture') {
          const captureTime = 30 * 1000;
          const elapsedMs = e.captureProgress || 0;
          const remaining = captureTime - elapsedMs;
          maxRemaining = Math.max(maxRemaining, remaining);
        }
      });
      return maxRemaining;
    }

    // Check if any effect is a one-time action (jam - should stay 2 seconds)
    const hasJamEffect = effects.some(e => e.kind === 'jam');
    if (hasJamEffect) {
      return 2000;
    }

    // Check if any effect has a defined duration (fake_position)
    const hasDurationEffect = effects.some(e => e.kind === 'fake_position' && e.until);
    if (hasDurationEffect) {
      const fakePosEffect = effects.find(e => e.kind === 'fake_position');
      if (fakePosEffect && fakePosEffect.until) {
        return Math.max(0, fakePosEffect.until - Date.now());
      }
    }

    // For other notifications (join_request, balise_lure), use a longer duration
    // These have clickable buttons and should stay longer
    const hasButtonEffect = effects.some(e => 
      e.kind === 'join_request' || e.kind === 'balise_lure'
    );
    if (hasButtonEffect) {
      return 10000; // 10 seconds for button notifications
    }

    // Default fallback
    return 2000;
  };

  useEffect(() => {
    if (effectKey === 'none' || effectKey === 'empty') {
      setAnimationState('exiting'); // On lance la sortie si l'effet disparaît
      effectRef.current = null;
      return;
    }

    const prevKey = effectRef.current;
    let prevJam = null;
    if (prevKey) {
      const m = String(prevKey).match(/jam:([^|]+)/);
      if (m) prevJam = m[1];
    }

    let currentJam = null;
    const currentMatch = String(effectKey).match(/jam:([^|]+)/);
    if (currentMatch) currentJam = currentMatch[1];

    // Pour les notifications jam, on relance toujours l'animation et le timer à chaque changement
    const isJamEffect = currentJam !== null;
    
    if (isJamEffect) {
      if (currentJam && prevJam && prevJam !== currentJam) {
        prevJamLabelRef.current = prevJam;
      } else {
        prevJamLabelRef.current = null;
      }
      
      effectRef.current = effectKey;
      setAnimationState('entering'); // On déclenche l'animation d'entrée

      // Pour les jam, durée fixe de 2 secondes
      const timer = setTimeout(() => {
        setAnimationState('exiting');
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Pour les autres effets, comportement normal
    if (currentJam && prevJam && prevJam !== currentJam) {
      prevJamLabelRef.current = prevJam;
    } else {
      prevJamLabelRef.current = null;
    }

    effectRef.current = effectKey;
    setAnimationState('entering'); // On déclenche l'animation d'entrée

    // Calculate dynamic duration based on notification type
    const duration = getNotificationDuration(effect);

    // Use the calculated duration instead of hardcoded 2 seconds
    const timer = setTimeout(() => {
      setAnimationState('exiting');
    }, duration);

    return () => clearTimeout(timer);
  }, [effectKey, effect, uiNow]);

  if (!effect) return null;

  const effects = Array.isArray(effect) ? effect : [effect];

  const getContent = (currentEffect) => {
    if (currentEffect.kind === "noise") {
      const elapsedMs = Math.max(0, uiNow - currentEffect.startedAt);
      const totalMs = Math.max(1, currentEffect.durationSec * 1000);
      const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
      const progress = Math.min(1, elapsedMs / totalMs);
      if (elapsedMs > totalMs) return null;

      const volumeLabel =
        currentEffect.volume === "low" ? "Bas" : currentEffect.volume === "high" ? "Fort" : "Moyen";

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {currentEffect.volume === "high" ? "🔊" : currentEffect.volume === "low" ? "🔈" : "🔉"}
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Bruit fantôme</p>
              <p className="text-xs font-semibold text-blue-700">
                {currentEffect.by} fait vibrer ({volumeLabel})
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

    if (currentEffect.kind === "ghost") {
      const total = currentEffect.invisUntil - currentEffect.invisSince;
      const rest = currentEffect.invisUntil - uiNow;
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
                className="pointer-events-auto px-3 py-1 text-xs font-semibold text-blue-600 bg-white rounded-full border border-blue-300 hover:bg-blue-50"
              >
                Visible
              </button>
            )}
          </div>
        </>
      );
    }

    if (currentEffect.kind === "immobilized") {
      const rest = currentEffect.until - uiNow;
      if (rest <= 0) return null;
      const remainingSec = Math.max(1, Math.round(rest / 1000));
      const totalDuration = 10000;
      const progress = Math.max(0, Math.min(1, rest / totalDuration));

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧊</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Immobilisé</p>
              <p className="text-xs font-semibold text-blue-700">Carte gelée</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${Math.max(8, progress * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{remainingSec}s</span>
          </div>
        </>
      );
    }

    if (currentEffect.kind === "jam") {
      const jamLevel = currentEffect.label;
      const isSmall = jamLevel === 'small';
      const isNormal = jamLevel === 'normal' || jamLevel === 'medium';
      const isLarge = jamLevel === 'large';

      const labelToText = (lbl) => {
        if (lbl === 'small') return 'Petit';
        if (lbl === 'normal' || lbl === 'medium') return 'Moyen';
        if (lbl === 'large') return 'Grand';
        return '';
      };
      
      const prevLabel = prevJamLabelRef.current;
      const showTransition = prevLabel && prevLabel !== jamLevel;

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📡</span>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Cercle de brouillage</p>
          </div>
          <div className="flex flex-col gap-2 mt-3">
            {showTransition && (
              <div className="text-xs font-semibold text-blue-700 mb-1 text-center">
                {labelToText(prevLabel)} → {labelToText(jamLevel)}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div 
                className={`h-2 flex-1 rounded-full transition-all duration-700 ease-in-out ${isSmall ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' : 'bg-gray-200 scale-100'}`}
                style={{
                  transition: 'background-color 700ms ease-in-out, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 700ms ease-in-out'
                }}
              />
              <div 
                className={`h-2 flex-1 rounded-full transition-all duration-700 ease-in-out ${isNormal ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50 scale-110' : 'bg-gray-200 scale-100'}`}
                style={{
                  transition: 'background-color 700ms ease-in-out, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 700ms ease-in-out'
                }}
              />
              <div 
                className={`h-2 flex-1 rounded-full transition-all duration-700 ease-in-out ${isLarge ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-110' : 'bg-gray-200 scale-100'}`}
                style={{
                  transition: 'background-color 700ms ease-in-out, transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 700ms ease-in-out'
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold flex-1 text-center transition-colors duration-700 ${isSmall ? 'text-red-500' : 'text-gray-400'}`}>Petit</span>
              <span className={`text-xs font-semibold flex-1 text-center transition-colors duration-700 ${isNormal ? 'text-yellow-500' : 'text-gray-400'}`}>Moyen</span>
              <span className={`text-xs font-semibold flex-1 text-center transition-colors duration-700 ${isLarge ? 'text-green-500' : 'text-gray-400'}`}>Grand</span>
            </div>
          </div>
        </>
      );
    }

    if (currentEffect.kind === "balise_lure") {
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

    if (currentEffect.kind === "balise_capture") {
      const captureTime = 30 * 1000; // 30 seconds
      const elapsedMs = currentEffect.captureProgress || 0;
      const remainingMs = Math.max(0, captureTime - elapsedMs);
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const progress = Math.min(1, elapsedMs / captureTime);
      const isMyCapture = currentEffect.isMyCapture;

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Capture de balise</p>
              <p className="text-xs font-semibold text-blue-700">
                {isMyCapture ? "Vous capturez" : `${currentEffect.nickname} capture`} la balise
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${Math.max(8, progress * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{remainingSec}s</span>
          </div>
        </>
      );
    }

    if (currentEffect.kind === "fake_position") {
      const until = currentEffect.until || 0;
      const remainingMs = Math.max(0, until - Date.now());
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-purple-900">Leurre de position</p>
              <p className="text-xs font-semibold text-purple-700">
                Votre position est masquée aux autres joueurs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-purple-600 tabular-nums">{remainingSec}s</span>
            <button
              type="button"
              onClick={() => currentEffect.onCancel?.()}
              className="flex-1 px-3 py-2 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 pointer-events-auto"
            >
              Rétablir ma position
            </button>
          </div>
        </>
      );
    }

    if (currentEffect.kind === "join_request") {
      return (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900">Demande de rejoindre</p>
              <p className="text-xs font-semibold text-blue-700">
                {currentEffect.nickname} veut rejoindre la partie
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => currentEffect.onAccept?.()}
              className="flex-1 px-3 py-2 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 pointer-events-auto"
            >
              Accepter
            </button>
            <button
              type="button"
              onClick={() => currentEffect.onDeny?.()}
              className="flex-1 px-3 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 pointer-events-auto"
            >
              Refuser
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  // Ne filtre que si l'état est complètement 'hidden'
  const validEffects = effects.filter(e => {
    if (!e) return false;
    if (animationState === 'hidden') return false;
    const content = getContent(e);
    return content !== null;
  });

  if (validEffects.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px) scale(0.1);
            opacity: 0;
          }
          to {
            transform: translateY(60px) scale(1);
            opacity: 1;
          }
        }
        /* L'animation de sortie : Exactement l'inverse de slideIn */
        @keyframes slideOut {
          from {
            transform: translateY(60px) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-20px) scale(0.1);
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from {
            width: 0;
            height: 0;
            opacity: 0;
          }
          to {
            width: 48px;
            height: 48px;
            opacity: 0.3;
          }
        }
        /* Inverse du petit cercle de fond */
        @keyframes fadeOut {
          from {
            width: 48px;
            height: 48px;
            opacity: 0.3;
          }
          to {
            width: 0;
            height: 0;
            opacity: 0;
          }
        }
      `}</style>
      <div className="fixed inset-0 z-40 pointer-events-none flex items-start justify-center pt-16 gap-3">
        {validEffects.map((e, index) => {
          const content = getContent(e);
          if (!content) return null;
          return (
            <div
              key={`${e.kind}-${index}`}
              className="relative"
              style={{
                // Application dynamique de slideIn ou slideOut
                animation: animationState === 'entering'
                  ? 'slideIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  : 'slideOut 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                animationIterationCount: '1'
              }}
              // Quand le slideOut se termine, on masque définitivement l'élément du DOM
              onAnimationEnd={() => {
                if (animationState === 'exiting') {
                  setAnimationState('hidden');
                }
              }}
            >
              {/* Cercle d'effet avec fadeIn / fadeOut */}
              <div
                className="notification-circle absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-2xl"
                style={{
                  animation: animationState === 'entering'
                    ? 'fadeIn 400ms ease-out forwards'
                    : 'fadeOut 400ms ease-out forwards',
                  animationIterationCount: '1'
                }}
              />

              {/* Conteneur principal */}
              <div
                className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border border-blue-200 overflow-hidden pointer-events-auto"
              >
                {content}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default AnimatedGameNotification;