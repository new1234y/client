import React from "react";

function ScreenShell({ children, className = "" }) {
  return (
    <div className={`flex min-h-full flex-col items-center justify-center bg-slate-50 p-6 text-slate-950 dark:bg-slate-950 dark:text-white ${className}`}>
      {children}
    </div>
  );
}

export function NotFoundPage({ onHome }) {
  return (
    <ScreenShell>
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-black tracking-tight text-blue-600">404</p>
        <h1 className="mt-4 text-2xl font-black">Page introuvable</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Cette adresse ne correspond à aucune page de Chase GPS.
        </p>
        <button
          type="button"
          onClick={onHome}
          className="mt-6 min-h-11 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Retour à l’accueil
        </button>
      </div>
    </ScreenShell>
  );
}

export function ServerErrorPage({ error, onRetry, onHome }) {
  return (
    <ScreenShell>
      <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 text-center shadow-xl dark:border-red-900/60 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-950/60">
          !
        </div>
        <h1 className="mt-4 text-2xl font-black">Serveur indisponible</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Impossible de démarrer la connexion au serveur. Vérifiez votre réseau,
          puis réessayez.
        </p>
        {error && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 flex-1 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={onHome}
            className="min-h-11 flex-1 rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Retour à l’accueil
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}

export function ReconnectBanner({ attempt, error, onLeave }) {
  return (
    <div className="z-[1200] shrink-0 border-b border-amber-200 bg-amber-50/95 px-3 py-3 text-xs text-amber-950 backdrop-blur dark:border-amber-900/70 dark:bg-amber-950/80 dark:text-amber-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="font-black">Connexion interrompue</p>
          <p className="mt-0.5 leading-relaxed">
            Reconnexion automatique en cours{attempt > 0 ? ` · tentative ${attempt}` : ""}.
          </p>
          {error && <p className="mt-0.5 truncate text-[11px] font-semibold text-red-700 dark:text-red-300">{error}</p>}
        </div>
        {onLeave && (
          <button
            type="button"
            onClick={onLeave}
            className="min-h-10 w-full rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100 sm:w-auto dark:bg-slate-900 dark:text-slate-100 dark:ring-amber-800 dark:hover:bg-slate-800"
          >
            Quitter la partie
          </button>
        )}
      </div>
    </div>
  );
}

export function RecapLoading() {
  return (
    <ScreenShell className="gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-sm text-slate-600 dark:text-slate-400">Chargement du récap…</p>
    </ScreenShell>
  );
}

export function RecapError({ onHome }) {
  return (
    <ScreenShell className="gap-4">
      <p className="text-center text-slate-700 dark:text-slate-300">Récap introuvable ou expiré.</p>
      <button
        type="button"
        onClick={onHome}
        className="min-h-11 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
      >
        Accueil
      </button>
    </ScreenShell>
  );
}
