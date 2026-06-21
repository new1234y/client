import { useState, useEffect } from "react";
import { formatDurationMs } from "../../lib/format";
import Button from "../ui/Button.jsx";

export function RoleModal({ role, onClose }) {
  const roleInfo = {
    cat: {
      icon: "🐱",
      title: "Chat",
      description: "Vous êtes le Chat ! Attrapez tous les joueurs avant la fin de la partie.",
      abilities: [
        "Scanner les joueurs pour les attraper",
        "Utiliser des pouvoirs spéciaux (brouillage, bruit fantôme, gel)",
        "Voir la position des joueurs sur la carte"
      ]
    },
    player: {
      icon: "🏃",
      title: "Joueur",
      description: "Vous êtes un Joueur ! Survivez jusqu'à la fin de la partie en évitant le Chat.",
      abilities: [
        "Bouger pour éviter d'être attrapé",
        "Utiliser des pouvoirs de défense (invisibilité, etc.)",
        "Coopérer avec les autres joueurs"
      ]
    },
    spectator: {
      icon: "👁️",
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
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm touch-none"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
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
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{info.icon}</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{info.title}</h2>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClose();
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
            onClose();
          }}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export function ZoneModal({ phaseState, totalPhases, currentPhase, currentRadius, nextRadius, gameStartedAt, timeLimitEndsAt, shrinkZoneEnabled, timeLimitEnabled, onClose }) {
  const [phases, setPhases] = useState([]);
  const [gameTimeLeft, setGameTimeLeft] = useState(null);

  useEffect(() => {
    if (!gameStartedAt || !timeLimitEndsAt || !totalPhases || !shrinkZoneEnabled) {
      setPhases([]);
      return;
    }
    const total = timeLimitEndsAt - gameStartedAt;
    const phaseDuration = total / totalPhases;
    const phaseData = Array.from({ length: totalPhases }).map((_, i) => {
      const startTs = gameStartedAt + i * phaseDuration;
      const endTs = startTs + phaseDuration;
      const remaining = Math.max(0, Math.ceil((startTs - Date.now()) / 1000));
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
    setPhases(phaseData);
  }, [gameStartedAt, timeLimitEndsAt, totalPhases, currentPhase, shrinkZoneEnabled]);

  useEffect(() => {
    if (!timeLimitEndsAt || !timeLimitEnabled || shrinkZoneEnabled) {
      setGameTimeLeft(null);
      return;
    }
    const tick = () => setGameTimeLeft(Math.max(0, Math.ceil((timeLimitEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeLimitEndsAt, timeLimitEnabled, shrinkZoneEnabled]);

  const fmt = (s) => {
    if (s == null) return "--:--";
    return formatDurationMs(s * 1000);
  };

  const calculateProgress = () => {
    if (!shrinkZoneEnabled && timeLimitEnabled && timeLimitEndsAt && gameStartedAt) {
      const total = timeLimitEndsAt - gameStartedAt;
      const elapsed = Date.now() - gameStartedAt;
      return Math.min(1, Math.max(0, elapsed / total));
    }
    if (shrinkZoneEnabled && totalPhases && currentPhase) {
      return currentPhase / totalPhases;
    }
    return 0;
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm touch-none"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
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
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
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
              onClose();
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
                      ? "bg-blue-100 border-2 border-blue-600"
                      : phase.isPast
                        ? "bg-slate-100 opacity-60"
                        : "bg-slate-50"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    phase.isCurrent
                      ? "bg-blue-600 text-white"
                      : phase.isPast
                        ? "bg-slate-400 text-white"
                        : "bg-slate-200 text-slate-600"
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
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Temps restant</p>
            </div>

            <div className="bg-slate-100 rounded-xl p-4 dark:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progression</span>
                <span className="text-sm font-bold text-blue-600">{Math.round(calculateProgress() * 100)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
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
            <div className="text-4xl mb-4">♾️</div>
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
            onClose();
          }}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export function GameModal({ gameStartedAt, timeLimitEndsAt, totalProgress, gameType, onClose, gameMode = null, nextBaliseAt = null, jamLevel = null }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [nextBaliseTimeLeft, setNextBaliseTimeLeft] = useState(null);

  useEffect(() => {
    if (!timeLimitEndsAt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((timeLimitEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeLimitEndsAt]);

  useEffect(() => {
    if (!nextBaliseAt) {
      setNextBaliseTimeLeft(null);
      return;
    }
    const tick = () => setNextBaliseTimeLeft(Math.max(0, nextBaliseAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextBaliseAt]);

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
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm touch-none"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
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
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
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
              onClose();
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
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Temps restant</p>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progression</span>
              <span className="text-sm font-bold text-blue-600">{Math.round(totalProgress * 100)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
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
                <span className="text-2xl">📡</span>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cercle de brouillage</p>
              </div>
              <div className="flex flex-col gap-2">
                {/* Progress bars with visual effects */}
                <div className="flex items-center gap-2">
                  <div 
                    className={`h-2 flex-1 rounded-full ${jamLevel === 'small' ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' : 'bg-slate-200 scale-100'}`}
                    style={{
                      transition: 'background-color 300ms ease-in-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease-in-out'
                    }}
                  />
                  <div 
                    className={`h-2 flex-1 rounded-full ${jamLevel === 'medium' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50 scale-110' : 'bg-slate-200 scale-100'}`}
                    style={{
                      transition: 'background-color 300ms ease-in-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease-in-out'
                    }}
                  />
                  <div 
                    className={`h-2 flex-1 rounded-full ${jamLevel === 'large' ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-110' : 'bg-slate-200 scale-100'}`}
                    style={{
                      transition: 'background-color 300ms ease-in-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease-in-out'
                    }}
                  />
                </div>
                {/* Labels */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold flex-1 text-center transition-colors duration-300 ${jamLevel === 'small' ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>Petit</span>
                  <span className={`text-xs font-semibold flex-1 text-center transition-colors duration-300 ${jamLevel === 'medium' ? 'text-yellow-500' : 'text-slate-400 dark:text-slate-500'}`}>Moyen</span>
                  <span className={`text-xs font-semibold flex-1 text-center transition-colors duration-300 ${jamLevel === 'large' ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>Grand</span>
                </div>
                {/* Current level indicator */}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Actuel : <span className={`font-bold ${jamLevel === 'small' ? 'text-red-600' : jamLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{jamConfig.label}</span>
                  </p>
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
            onClose();
          }}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}
