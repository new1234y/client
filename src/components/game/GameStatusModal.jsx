import React, { useState, useEffect } from 'react';

export default function GameStatusModal({
  timeRemaining = '2:45',
  zoneState = null,
  progress = 11,
  coins = 35,
  playerType = 'player', // 'player' or 'cat'
  shrinkZoneEnabled = true,
  timeLimitEnabled = false,
  onCoinsClick = null,
  onTimerClick = null,
  onProgressClick = null,
  onPlayerClick = null,
  className = ''
}) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Animation de la barre de progression au montage
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center justify-center w-full max-w-2xl px-4 ${className}`}>

      {/* Fond de la barre (les "ailes" plus petites en hauteur) */}
      <div className="absolute left-4 right-4 h-16 bg-white/95 backdrop-blur-xl rounded-[40px] shadow-lg ring-1 ring-slate-200" />

      {/* Conteneur principal superposé */}
      <div className="relative z-10 w-full flex items-center justify-between">
        
        {/* GAUCHE : Icône Joueur */}
        {!shrinkZoneEnabled && !timeLimitEnabled ? (
          <div className="flex-1 flex items-center justify-start pl-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayerClick?.();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm text-amber-500 flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              {playerType === 'player' ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 21a6 6 0 0 0-12 0" />
                  <circle cx="12" cy="10" r="4" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5c.67 0 1.35.09 2 .26L18.5 2 17 6.5a7.5 7.5 0 1 1-10 0L5.5 2 10 5.26c.65-.17 1.33-.26 2-.26Z" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-start pl-3 gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayerClick?.();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm text-amber-500 flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              {playerType === 'player' ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 21a6 6 0 0 0-12 0" />
                  <circle cx="12" cy="10" r="4" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5c.67 0 1.35.09 2 .26L18.5 2 17 6.5a7.5 7.5 0 1 1-10 0L5.5 2 10 5.26c.65-.17 1.33-.26 2-.26Z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCoinsClick?.();
              }}
              className="flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
            >
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="url(#coinGradient)" stroke="#D97706" strokeWidth="1.5" />
                <circle cx="9" cy="9" r="3" fill="white" opacity="0.4" />
                <path d="M12 7v10M9 9l3-2 3 2M9 15l3 2 3-2" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFED9A" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-lg font-bold text-[#446b9e] tabular-nums">{coins}</span>
            </button>
          </div>
        )}

        {/* CENTRE : Le Timer */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTimerClick?.();
          }}
          className="flex-shrink-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl rounded-[2.25rem] px-8 py-3 shadow-lg ring-1 ring-slate-200 hover:scale-105 transition-transform cursor-pointer mx-2"
        >
          <span className="text-[2rem] font-extrabold text-[#2563eb] tabular-nums tracking-tight leading-none mb-0.5">
            {!shrinkZoneEnabled && !timeLimitEnabled ? '♾️' : timeRemaining}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#5c728e] whitespace-nowrap">
            {!shrinkZoneEnabled && !timeLimitEnabled ? 'Sans Limite' : shrinkZoneEnabled ? (zoneState === 'waiting' ? 'En Attente' : zoneState === 'shrinking' ? 'Rétrécissement' : zoneState === 'stopped' ? 'Arrêté' : 'Temps Restant') : 'Temps Restant'}
          </span>
        </button>

        {/* DROITE : Barre de progression ou Coins */}
        {!shrinkZoneEnabled && !timeLimitEnabled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCoinsClick?.();
            }}
            className="flex-1 flex items-center justify-end pr-6 gap-1.5 cursor-pointer hover:scale-105 transition-transform"
          >
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="url(#coinGradient)" stroke="#D97706" strokeWidth="1.5" />
              <circle cx="9" cy="9" r="3" fill="white" opacity="0.4" />
              <path d="M12 7v10M9 9l3-2 3 2M9 15l3 2 3-2" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFED9A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-lg font-bold text-[#446b9e] tabular-nums">{coins}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProgressClick?.();
            }}
            className="flex-1 flex flex-col items-end justify-center pr-6 gap-1.5 cursor-pointer hover:scale-105 transition-transform"
          >
            <span className="text-sm font-bold text-[#446b9e] tabular-nums leading-none">
              {displayProgress}%
            </span>
            <div className="h-2.5 w-full max-w-[130px] overflow-hidden rounded-full bg-[#d2e0f0]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] transition-all duration-700 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </button>
        )}

      </div>
    </div>
  );
}

export function PlayerModal({ playerType, onClose, playerName = 'Joueur', playerStats = {} }) {
  const isPlayer = playerType === 'player';
  const icon = isPlayer ? '🏃' : '🐱';
  const roleLabel = isPlayer ? 'Joueur' : 'Chat';

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
            <span className="text-4xl">{icon}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profil {roleLabel}</h2>
              <p className="text-sm text-slate-500">{playerName}</p>
            </div>
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

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Rôle</span>
            <span className="text-sm font-bold text-blue-600">{roleLabel}</span>
          </div>

          {playerStats.coins != null && (
            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Pièces</span>
              <span className="text-sm font-bold text-amber-600">{playerStats.coins}</span>
            </div>
          )}

          {playerStats.kills != null && (
            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Captures</span>
              <span className="text-sm font-bold text-red-600">{playerStats.kills}</span>
            </div>
          )}

          {playerStats.survivals != null && (
            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Survies</span>
              <span className="text-sm font-bold text-green-600">{playerStats.survivals}</span>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {isPlayer
              ? '💡 En tant que joueur, votre objectif est de survivre aux réductions de zone et d\'échapper au chat.'
              : '🐱 En tant que chat, votre objectif est de capturer tous les joueurs avant la fin du temps imparti.'}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 dark:shadow-none"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}