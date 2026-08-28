import { formatDurationMs } from "../../lib/format";
import Button from "../ui/Button.jsx";
import { remainingMs, remainingSeconds, useServerNow } from "../../hooks/useServerNow.js";
import useAnimatedClose from "../../hooks/useAnimatedClose.js";

export function RoleModal({ role, onClose }) {
  const { leaving, requestClose, onExitAnimationEnd } = useAnimatedClose(onClose);
  const leave = leaving ? " is-leaving" : "";
  const roleInfo = {
    cat: {
      icon: "chat",
      title: "Chat",
      description: "Vous êtes le Chat ! Attrapez tous les joueurs avant la fin de la partie.",
      abilities: [
        "Scanner les joueurs pour les attraper",
        "Utiliser des pouvoirs spéciaux (brouillage, bruit fantôme, gel)",
        "Voir la position des joueurs sur la carte"
      ]
    },
    player: {
      icon: "souris",
      title: "Souris",
      description: "Vous êtes une Souris ! Survivez jusqu'à la fin de la partie en évitant le Chat.",
      abilities: [
        "Bouger pour éviter d'être attrapé",
        "Utiliser des pouvoirs de défense (invisibilité, etc.)",
        "Coopérer avec les autres joueurs"
      ]
    },
    spectator: {
      icon: "spec",
      title: "Spectateur",
      description: "Vous êtes un Spectateur ! Observez la partie sans y participer.",
      abilities: [
        "Voir la position de tous les joueurs",
        "Suivre l'action en temps réel"
      ]
    }
  };

  const info = roleInfo[role] || roleInfo.spectator;

  return (
    <div
className={`sheet-overlay fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm touch-none sm:items-start sm:p-2 sm:pt-2${leave}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }}
      onAnimationEnd={onExitAnimationEnd}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
className={`sheet-panel mt-0 w-full max-w-sm rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-950 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:mt-1 sm:rounded-2xl${leave}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${info.icon === "chat" ? "bg-blue-600" : info.icon === "souris" ? "bg-amber-500" : "bg-slate-500"}`}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {info.icon === "chat" ? (
                  <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>
                ) : info.icon === "souris" ? (
                  <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>
                ) : (
                  <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>
                )}
              </svg>
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{info.title}</h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              requestClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{info.description}</p>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capacités</h3>
          <ul className="space-y-1">
            {info.abilities.map((ability, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                {ability}
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant="primary"
          className="mt-6 w-full"
          onClick={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export function ZoneModal({ phaseState, totalPhases, currentPhase, currentRadius, nextRadius, gameStartedAt, timeLimitEndsAt, shrinkZoneEnabled, timeLimitEnabled, onClose }) {
  const { leaving, requestClose, onExitAnimationEnd } = useAnimatedClose(onClose);
  const leave = leaving ? " is-leaving" : "";
  const now = useServerNow();
  const phases = (() => {
    if (!gameStartedAt || !timeLimitEndsAt || !totalPhases || !shrinkZoneEnabled) return [];
    const total = timeLimitEndsAt - gameStartedAt;
    const phaseDuration = total / totalPhases;
    return Array.from({ length: totalPhases }).map((_, i) => {
      const startTs = gameStartedAt + i * phaseDuration;
      const endTs = startTs + phaseDuration;
      const remaining = Math.max(0, Math.ceil((startTs - now) / 1000));
      return {
        index: i + 1,
        startTs,
        endTs,
        remaining,
        label: remaining <= 0 ? "Terminé" : formatDurationMs(remaining * 1000),
        isCurrent: i === currentPhase - 1,
        isFuture: i >= currentPhase,
        isPast: i < currentPhase - 1
      };
    });
  })();
  const gameTimeLeft = (!timeLimitEndsAt || !timeLimitEnabled || shrinkZoneEnabled)
    ? null
    : remainingSeconds(timeLimitEndsAt, now);

  const fmt = (s) => {
    if (s == null) return "--:--";
    return formatDurationMs(s * 1000);
  };

  const calculateProgress = () => {
    if (!shrinkZoneEnabled && timeLimitEnabled && timeLimitEndsAt && gameStartedAt) {
      const total = timeLimitEndsAt - gameStartedAt;
      const elapsed = now - gameStartedAt;
      return Math.min(1, Math.max(0, elapsed / total));
    }
    if (shrinkZoneEnabled && totalPhases && currentPhase) {
      return currentPhase / totalPhases;
    }
    return 0;
  };

  return (
    <div
className={`sheet-overlay fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm touch-none sm:items-start sm:p-2 sm:pt-2${leave}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }}
      onAnimationEnd={onExitAnimationEnd}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
className={`sheet-panel mt-0 w-full max-w-sm rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-950 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:mt-1 sm:rounded-2xl${leave}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {shrinkZoneEnabled ? "Étapes de zone" : "Temps de partie"}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              requestClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {shrinkZoneEnabled ? (
          <>
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              <p>État actuel : <span className="font-semibold text-blue-600">
                {phaseState === "waiting" ? "En attente" : phaseState === "shrinking" ? "Rétrécissement" : "Arrêté"}
              </span></p>
              <p>Rayon actuel : <span className="font-semibold">{Math.round(currentRadius)}m</span>
              {nextRadius && nextRadius !== currentRadius && (
                <span className="text-orange-500"> → {Math.round(nextRadius)}m</span>
              )}
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {phases.map((phase) => (
                <div
                  key={phase.index}
                  className={`flex items-center gap-3 rounded-lg p-3 ${
                    phase.isCurrent
                      ? "border-2 border-blue-600 bg-blue-100 dark:bg-blue-950/40"
                      : phase.isPast
                        ? "bg-slate-100 opacity-60 dark:bg-slate-800"
                        : "bg-slate-50 dark:bg-slate-800/60"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    phase.isCurrent
                      ? "bg-blue-600 text-white"
                      : phase.isPast
                        ? "bg-slate-400 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  }`}>
                    {phase.index}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {phase.isCurrent ? "En cours" : phase.isPast ? "Terminé" : `Dans ${phase.label}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {phase.isPast ? "Phase terminée" : phase.isCurrent ? "Phase active" : "Phase à venir"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : timeLimitEnabled ? (
          <>
            <div className="mb-4 text-center">
              <div className="text-5xl font-black tabular-nums text-blue-600 mb-2">
                {fmt(gameTimeLeft)}
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Temps restant</p>
            </div>

            <div className="bg-slate-100 rounded-xl p-4 dark:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progression</span>
                <span className="text-sm font-bold text-blue-600">{Math.round(calculateProgress() * 100)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${calculateProgress() * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mt-4">
              <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Début</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {gameStartedAt ? new Date(gameStartedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Fin</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {timeLimitEndsAt ? new Date(timeLimitEndsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <span className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
              <span className="absolute inset-2 rounded-full border border-white/70" />
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">Partie sans limite</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cette partie n'a pas de limite de temps ni de rétrécissement de zone.
            </p>
          </div>
        )}

        <Button
          variant="primary"
          className="mt-4 w-full"
          onClick={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export function GameModal({ gameStartedAt, timeLimitEndsAt, totalProgress, gameType, onClose, gameMode = null, nextBaliseAt = null, jamLevel = null }) {
  const { leaving, requestClose, onExitAnimationEnd } = useAnimatedClose(onClose);
  const leave = leaving ? " is-leaving" : "";
  const now = useServerNow();
  const timeLeft = remainingSeconds(timeLimitEndsAt, now);
  const nextBaliseTimeLeft = remainingMs(nextBaliseAt, now);

  const fmt = (s) => {
    if (s == null) return "--:--";
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const formatBaliseTime = (ms) => {
    if (ms == null) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min ${seconds} s`;
  };

  const getModeDisplayName = (mode) => {
    if (!mode) return 'Standard';
    const modeMap = {
      'tag swap': 'Chatounant',
      'zombie': 'Chat zombie',
      'standard': 'Standard',
      'hardcore': 'Hardcore',
      'stealth': 'Furtif',
    };
    return modeMap[mode.toLowerCase()] || mode;
  };

  const getJamLevelConfig = (level) => {
    if (!level) return null;
    const configs = {
      'small': { label: 'Petit', color: 'bg-green-500', progress: 33 },
      'medium': { label: 'Moyen', color: 'bg-orange-500', progress: 66 },
      'large': { label: 'Grand', color: 'bg-red-500', progress: 100 },
    };
    return configs[level] || configs['medium'];
  };

  const jamConfig = getJamLevelConfig(jamLevel);

  return (
    <div
className={`sheet-overlay fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm touch-none sm:items-start sm:p-2 sm:pt-2${leave}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }}
      onAnimationEnd={onExitAnimationEnd}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
className={`sheet-panel mt-0 w-full max-w-sm rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-950 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700 sm:mt-1 sm:rounded-2xl${leave}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Informations de partie</h2>
            {gameType && <p className="text-xs text-slate-500">{gameType}</p>}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              requestClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-black tabular-nums text-blue-600 mb-2">
              {fmt(timeLeft)}
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Temps restant</p>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progression</span>
              <span className="text-sm font-bold text-blue-600">{Math.round(totalProgress * 100)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${totalProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Début</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {gameStartedAt ? new Date(gameStartedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
            <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Fin</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {timeLimitEndsAt ? new Date(timeLimitEndsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
          </div>

          {/* Cercle de brouillage - full line with notification-style visual */}
          {jamConfig && (
            <div className="bg-slate-100 rounded-xl p-4 dark:bg-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 14 0"/></svg></span>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cercle de brouillage</p>
              </div>
              <div className="flex flex-col gap-2">
                {/* Progress bars with visual effects */}
                <div className="flex items-center gap-2">
                  <div className={`h-2 flex-1 rounded-full ${jamLevel === 'small' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`h-2 flex-1 rounded-full ${jamLevel === 'normal' || jamLevel === 'medium' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <div className={`h-2 flex-1 rounded-full ${jamLevel === 'large' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold flex-1 text-center ${jamLevel === 'small' ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}`}>Petit</span>
                  <span className={`text-xs font-semibold flex-1 text-center ${jamLevel === 'normal' || jamLevel === 'medium' ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}`}>Moyen</span>
                  <span className={`text-xs font-semibold flex-1 text-center ${jamLevel === 'large' ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500'}`}>Grand</span>
                </div>
              </div>
            </div>
          )}

          {/* Mode and Prochaine balise - side by side */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Mode</p>
              <p className="font-semibold text-slate-900 dark:text-white">{getModeDisplayName(gameMode)}</p>
            </div>
            <div className="bg-slate-100 rounded-lg p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Prochaine balise</p>
              <p className="font-semibold text-slate-900 dark:text-white">{nextBaliseAt ? formatBaliseTime(nextBaliseTimeLeft) : '--:--'}</p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          className="mt-6 w-full"
          onClick={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}
