import { useState, useEffect, useRef } from 'react';
import { formatDurationMs, formatCoins } from '../../lib/format';
import { getServerTime } from "../../lib/serverTime.js";

function AnimatedGameNotification({ effect, uiNow, onGhostCancel, visible = true }) {
  // Gestion de l'état de l'animation : 'hidden' | 'entering' | 'exiting'
  // Track per-item animation states so each notification can exit independently
  const [items, setItems] = useState([]); // { key, effect, anim: 'entering'|'exiting' }
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
        case 'balise_blocked':
          return `balise_blocked:${e.message || ''}`;
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

  // Helper to normalize incoming effects into array
  const incoming = (() => {
    if (!effect) return [];
    return Array.isArray(effect) ? effect : [effect];
  })();

  // Keep items in sync with incoming effects, animating removals
  useEffect(() => {
    const next = [];
    const nowKeys = incoming.map(e => buildEffectKey(e));

    // Preserve existing items that still exist, update effect
    for (const it of items) {
      if (nowKeys.includes(it.key)) {
        const idx = nowKeys.indexOf(it.key);
        next.push({ key: it.key, effect: incoming[idx], anim: it.anim === 'exiting' ? 'exiting' : 'entering' });
      }
    }

    // Add new items
    for (let i = 0; i < incoming.length; i++) {
      const e = incoming[i];
      const k = buildEffectKey(e);
      if (!next.some(x => x.key === k)) {
        next.push({ key: k, effect: e, anim: 'entering' });
      }
    }

    // Detect removals: items present before but not in nowKeys -> mark exiting
    const removed = items.filter(it => !nowKeys.includes(it.key));
    if (removed.length > 0) {
      // Merge removed items as exiting so we can animate them out
      for (const r of removed) {
        if (!next.some(x => x.key === r.key)) {
          next.push({ key: r.key, effect: r.effect, anim: 'exiting' });
        }
      }
    }

    setItems(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectKey]);

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
        return Math.max(0, fakePosEffect.until - getServerTime());
      }
    }

    // Join requests stay until Accept/Deny — never auto-hide.
    if (effects.some(e => e.kind === 'join_request')) {
      return Number.POSITIVE_INFINITY;
    }

    // For other notifications (balise_lure), use a longer duration
    const hasButtonEffect = effects.some(e => e.kind === 'balise_lure');
    if (hasButtonEffect) {
      return 10000; // 10 seconds for button notifications
    }

    // Default fallback
    return 2000;
  };

  // Notifications are managed per-item in `items` state; individual enter/exit
  // animations are handled in the rendering loop. The old global animation
  // state logic was removed to avoid conflicts with per-item behavior.

  // keep effects ref for duration calculation if needed elsewhere
  const effects = Array.isArray(effect) ? effect : (effect ? [effect] : []);

  const getContent = (currentEffect) => {
    if (currentEffect.kind === "noise") {
      const elapsedMs = Math.max(0, uiNow - currentEffect.startedAt);
      const totalMs = Math.max(1, currentEffect.durationSec * 1000);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const progress = Math.min(1, elapsedMs / totalMs);
      if (elapsedMs > totalMs) return null;

      const volumeLabel =
        currentEffect.volume === "low" ? "Bas" : currentEffect.volume === "high" ? "Fort" : "Moyen";

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Bruit fantôme</p>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
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
            <span className="text-sm font-bold text-blue-600 tabular-nums">{formatDurationMs(remainingMs)}</span>
          </div>
        </>
      );
    }

    if (currentEffect.kind === "ghost") {
      const total = currentEffect.invisUntil - currentEffect.invisSince;
      const rest = currentEffect.invisUntil - uiNow;
      if (total <= 0 || rest <= 0) return null;
      const progress = 1 - rest / total;
  const remainingMs = Math.max(0, rest);
  const remainingSec = Math.max(1, Math.round(remainingMs / 1000));

      // Check if this is self-invisibility or other-invisibility
      const isSelf = currentEffect.scope === "self";
      const targetNames = currentEffect.targetNames;

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="10" r="4"/><path d="M8 14c-2 2-3 4-3 6h14c0-2-1-4-3-6"/></svg></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Mode ghost actif</p>
              {!isSelf && targetNames && (
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {targetNames} invisible(s)
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max(6, Math.min(100, progress * 100))}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{formatDurationMs(remainingMs)}</span>
            {onGhostCancel && (
              <button
                type="button"
                onClick={onGhostCancel}
                className="pointer-events-auto rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
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
  const remainingMs = Math.max(0, rest);
  const remainingSec = Math.max(1, Math.round(remainingMs / 1000));
      const totalDuration = 10000;
      const progress = Math.max(0, Math.min(1, rest / totalDuration));

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M4.9 6.5 19 17.5M4.9 17.5 19 6.5"/></svg></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Immobilisé</p>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Carte gelée</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${Math.max(8, progress * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{formatDurationMs(remainingMs)}</span>
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
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0"/></svg></span>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Cercle de brouillage</p>
          </div>
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 flex-1 rounded-full ${isSmall ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`} />
              <div className={`h-2 flex-1 rounded-full ${isNormal ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`} />
              <div className={`h-2 flex-1 rounded-full ${isLarge ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`} />
            </div>
            {/* Progress UI intentionally hidden — transient notification still exists and will be removed after 2s by App */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold flex-1 text-center ${isSmall ? 'text-blue-600' : 'text-slate-400'}`}>Petit</span>
              <span className={`text-xs font-semibold flex-1 text-center ${isNormal ? 'text-blue-600' : 'text-slate-400'}`}>Moyen</span>
              <span className={`text-xs font-semibold flex-1 text-center ${isLarge ? 'text-blue-600' : 'text-slate-400'}`}>Grand</span>
            </div>
          </div>
        </>
      );
    }

    if (currentEffect.kind === "balise_lure") {
      return (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg></span>
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
  const remainingMsSafe = Math.max(0, remainingMs);
  const remainingSec = Math.max(0, Math.ceil(remainingMsSafe / 1000));
      const progress = Math.min(1, elapsedMs / captureTime);
      const isMyCapture = currentEffect.isMyCapture;
  const awarded = Number.isFinite(currentEffect.awardedCoins) ? currentEffect.awardedCoins : null;
  const formattedAward = awarded != null ? formatCoins(awarded) : null;

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Capture de balise</p>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
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
            <span className="text-sm font-bold text-blue-600 tabular-nums">{formatDurationMs(remainingMsSafe)}</span>
            {awarded != null && (
              <span className="text-sm font-bold text-emerald-600 tabular-nums ml-3">+{formattedAward}</span>
            )}
          </div>
        </>
      );
    }

    if (currentEffect.kind === "balise_blocked") {
      return (
        <div className="mt-2 overflow-hidden rounded-xl bg-blue-600 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
          <p className="text-[10px] font-bold uppercase tracking-wider">Balise bloquée</p>
          <p className="text-[11px] font-semibold">
            {currentEffect.message}
          </p>
        </div>
      );
    }

    if (currentEffect.kind === "fake_position") {
      const until = currentEffect.until || 0;
      const remainingMs = Math.max(0, until - getServerTime());
  const remainingMsSafe2 = Math.max(0, remainingMs);
  const remainingSec = Math.max(0, Math.ceil(remainingMsSafe2 / 1000));

      return (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M8 10h.01M16 10h.01M8 15c1.2 1.3 2.7 2 4 2s2.8-.7 4-2"/></svg></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-purple-900">Leurre de position</p>
              <p className="text-xs font-semibold text-purple-700">
                Votre position est masquée aux autres joueurs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-purple-600 tabular-nums">{formatDurationMs(remainingMsSafe2)}</span>
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
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3"/><path d="M5 20c.6-4 2.5-6 7-6s6.4 2 7 6"/></svg></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Demande de rejoindre</p>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
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

  // Render only when we have items (items include exiting ones so exit animations play)
  if (items.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px) scale(0.12);
            opacity: 0;
            transform-origin: center top;
          }
          to {
            transform: translateY(60px) scale(1);
            opacity: 1;
            transform-origin: center top;
          }
        }
        /* Exit animation: shrink and translate back up while fading out to simulate "retracting" */
        @keyframes slideOut {
          from {
            transform: translateY(60px) scale(1);
            opacity: 1;
            transform-origin: center top;
          }
          to {
            transform: translateY(0px) scale(0.18);
            opacity: 0;
            transform-origin: center top;
          }
        }
        @keyframes fadeIn {
          from {
            width: 0;
            height: 0;
            opacity: 0;
            transform: scale(0.2);
          }
          to {
            width: 48px;
            height: 48px;
            opacity: 0.3;
            transform: scale(1);
          }
        }
        /* Shrink the small background circle on exit to make the notification feel like it "goes behind" the timer */
        @keyframes fadeOut {
          from {
            width: 48px;
            height: 48px;
            opacity: 0.3;
            transform: scale(1);
          }
          to {
            width: 0;
            height: 0;
            opacity: 0;
            transform: scale(0.1);
          }
        }
      `}</style>
      <div className={`fixed inset-0 z-40 pointer-events-none flex items-start justify-center pt-[max(4rem,calc(env(safe-area-inset-top)+3.5rem))] gap-3 ${visible ? "" : "hidden"}`}>
        {(() => {
          const enteringItems = items.filter((it) => it.anim !== "exiting");
          const exitingItems = items.filter((it) => it.anim === "exiting");
          const queued = enteringItems.slice(2);
          const shown = [...enteringItems.slice(0, 2), ...exitingItems.slice(0, 2)];
          void queued;
          return shown;
        })().map((it) => {
          const e = it.effect;
          const content = getContent(e);
          if (!content) return null;
          const entering = it.anim === 'entering';
          return (
            <div
              key={it.key}
              className="relative"
              style={{
                animation: entering
                  ? 'slideIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  : 'slideOut 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                animationIterationCount: '1'
              }}
              onAnimationEnd={(ev) => {
                if (ev.target !== ev.currentTarget) return;
                if (!entering) {
                  setItems(prev => prev.filter(x => x.key !== it.key));
                }
              }}
            >
              <div
                className="notification-circle absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-2xl"
                style={{
                  animation: entering ? 'fadeIn 400ms ease-out forwards' : 'fadeOut 400ms ease-out forwards',
                  animationIterationCount: '1'
                }}
              />

              <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white/95 p-4 text-slate-950 shadow-2xl pointer-events-auto backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 dark:text-white">
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