import { useEffect, useState } from "react";
import GameTimer from "./GameTimer.jsx";

const JAM_LABELS = { small: "Petit", normal: "Moyen", large: "Grand" };

function JamPill({ jamLevel }) {
  return (
    <div className="flex items-center gap-1">
      {["small", "normal", "large"].map((lvl) => {
        const active = lvl === jamLevel;
        return (
          <span
            key={lvl}
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              active
                ? "bg-gradient-to-r from-[#FBBF24] to-[#F97316] text-white shadow-sm"
                : "bg-white/50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
            }`}
          >
            {JAM_LABELS[lvl]}
          </span>
        );
      })}
    </div>
  );
}

function ZonePhaseRow({
  shrinkZoneEnabled,
  currentRadius,
  nextRadius,
  phaseEndsAt,
  shrinkStartsAt,
  phaseState,
  totalPhases,
  currentPhase,
}) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const timerTarget =
      phaseState === "waiting" && shrinkStartsAt ? shrinkStartsAt : phaseEndsAt;
    if (!timerTarget) {
      setTimeLeft(null);
      return;
    }
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((timerTarget - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt, shrinkStartsAt, phaseState]);

  if (!shrinkZoneEnabled || currentRadius == null) return null;

  const minutes = timeLeft ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft ? timeLeft % 60 : 0;
  const phases = Math.max(1, totalPhases || 1);
  const phase = Math.max(1, currentPhase || 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: phases }).map((_, i) => {
          const done = i < phase - 1;
          const active = i === phase - 1;
          return (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                done
                  ? "bg-indigo-500"
                  : active
                    ? "animate-pulse bg-indigo-400"
                    : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
          );
        })}
      </div>

      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
        {Math.round(currentRadius)}m
        {nextRadius && nextRadius !== currentRadius && (
          <span className="text-orange-500"> → {Math.round(nextRadius)}m</span>
        )}
      </span>

      {phaseState && (
        <>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {phaseState === "waiting" && "Attente"}
            {phaseState === "shrinking" && "Rétrécissement"}
            {phaseState === "stopped" && "Arrêté"}
          </span>
        </>
      )}

      {timeLeft != null && timeLeft > 0 && phaseState !== "stopped" && (
        <>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
            {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        </>
      )}
    </div>
  );
}

function PowerExtension({ effect, uiNow, onGhostCancel }) {
  if (!effect) return null;

  if (effect.kind === "noise") {
    const elapsedMs = Math.max(0, uiNow - effect.startedAt);
    const totalMs = Math.max(1, effect.durationSec * 1000);
    const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
    const progress = Math.min(1, elapsedMs / totalMs);
    if (elapsedMs > totalMs) return null;

    const volumeLabel =
      effect.volume === "low" ? "Bas" : effect.volume === "high" ? "Fort" : "Moyen";

    return (
      <div className="mt-2 overflow-hidden rounded-xl bg-amber-500/95 px-3 py-2 text-amber-950 animate-[slideDown_0.25s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">
              {effect.volume === "high" ? "🔊" : effect.volume === "low" ? "🔈" : "🔉"}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider">Bruit fantôme</p>
              <p className="truncate text-[11px] font-semibold">
                {effect.by} fait vibrer ({volumeLabel})
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-amber-700/90 px-2 py-0.5 text-[10px] font-bold text-amber-100 tabular-nums">
            {remainingSec}s
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-amber-200/80">
          <div
            className="h-full rounded-full bg-amber-700 transition-[width] duration-200"
            style={{ width: `${Math.max(8, (1 - progress) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  if (effect.kind === "ghost") {
    const total = effect.invisUntil - effect.invisSince;
    const rest = effect.invisUntil - uiNow;
    if (total <= 0 || rest <= 0) return null;
    const progress = 1 - rest / total;
    const remainingSec = Math.max(1, Math.round(rest / 1000));

    return (
      <div className="mt-2 overflow-hidden rounded-xl bg-slate-800/95 px-3 py-2 text-slate-100 animate-[slideDown_0.25s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              👻 Mode ghost actif
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-slate-300"
                style={{ width: `${Math.max(6, Math.min(100, progress * 100))}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums">{remainingSec}s</span>
          {onGhostCancel && (
            <button
              type="button"
              onClick={onGhostCancel}
              className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-900"
            >
              Visible
            </button>
          )}
        </div>
      </div>
    );
  }

  if (effect.kind === "immobilized") {
    const rest = effect.until - uiNow;
    if (rest <= 0) return null;
    const remainingSec = Math.max(1, Math.round(rest / 1000));

    return (
      <div className="mt-2 overflow-hidden rounded-xl bg-indigo-600/95 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧊</span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">Immobilisé</p>
            <p className="text-[11px]">Carte gelée — {remainingSec}s restantes</p>
          </div>
        </div>
      </div>
    );
  }

  if (effect.kind === "jam") {
    return (
      <div className="mt-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400/90 to-orange-500/90 px-3 py-2 text-amber-950 animate-[slideDown_0.25s_ease-out]">
        <p className="text-[10px] font-bold uppercase tracking-wider">Cercle de brouillage</p>
        <p className="text-[11px] font-semibold">
          Zone {effect.label} — rayon ~{Math.round(effect.radiusM)}m
        </p>
      </div>
    );
  }

  return null;
}

export default function MapHud({
  role,
  isSpectator,
  jamLevel,
  connected,
  shrinkZoneEnabled,
  currentRadius,
  nextRadius,
  phaseEndsAt,
  shrinkStartsAt,
  phaseState,
  totalPhases,
  currentPhase,
  nextBaliseAt,
  baliseExpiresAt,
  timeLimitEndsAt,
  catLocked,
  isCat,
  mapUnlockAt,
  socket,
  variant = "mobile",
  powerEffect = null,
  powerUiNow = Date.now(),
  onGhostCancel = null,
}) {
  const [baliseLeft, setBaliseLeft] = useState(null);
  const baliseTarget = baliseExpiresAt || nextBaliseAt;
  const roleColor = role === "cat" ? "text-[#FB7185]" : "text-[#60A5FA]";
  const roleLabel = role === "cat" ? "Chat" : role === "player" ? "Joueur" : "—";

  useEffect(() => {
    if (!baliseTarget) {
      setBaliseLeft(null);
      return;
    }
    const tick = () =>
      setBaliseLeft(Math.max(0, Math.ceil((baliseTarget - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [baliseTarget]);

  const fmt = (s) => {
    if (s == null) return "--:--";
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold ${roleColor} dark:bg-slate-800/80`}
        >
          {roleLabel}
          {isSpectator && " · Spec"}
        </span>
        {!connected && (
          <span className="animate-pulse rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            Hors ligne
          </span>
        )}
      </div>

      <div className="mt-1.5">
        <ZonePhaseRow
          shrinkZoneEnabled={shrinkZoneEnabled}
          currentRadius={currentRadius}
          nextRadius={nextRadius}
          phaseEndsAt={phaseEndsAt}
          shrinkStartsAt={shrinkStartsAt}
          phaseState={phaseState}
          totalPhases={totalPhases}
          currentPhase={currentPhase}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
        {baliseLeft != null && (
          <span className="font-semibold text-purple-600 dark:text-purple-300">
            📍 Balise {fmt(baliseLeft)}
          </span>
        )}
        {timeLimitEndsAt && <GameTimer endsAt={timeLimitEndsAt} />}
        <JamPill jamLevel={jamLevel} />
        {catLocked && isCat && mapUnlockAt && (
          <CatLockBadge mapUnlockAt={mapUnlockAt} socket={socket} />
        )}
      </div>

      <PowerExtension effect={powerEffect} uiNow={powerUiNow} onGhostCancel={onGhostCancel} />
    </>
  );

  if (variant === "desktop") {
    return (
      <div className="pointer-events-auto max-w-xs rounded-3xl bg-gradient-to-br from-white/95 via-[#FFF5D7]/80 to-[#FDECF4]/80 p-3 shadow-lg ring-1 ring-white/60 backdrop-blur dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-800/90 dark:ring-slate-700">
        {inner}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full rounded-b-2xl bg-gradient-to-b from-white/98 via-[#FFF5D7]/95 to-white/90 px-4 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-lg ring-1 ring-amber-100/60 backdrop-blur dark:from-slate-900/98 dark:via-slate-900/95 dark:to-slate-900/90 dark:ring-slate-700">
      {inner}
    </div>
  );
}

function CatLockBadge({ mapUnlockAt, socket }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, Math.ceil((mapUnlockAt - Date.now()) / 1000));
      setLeft(r);
      if (r === 0) socket?.emit("refresh_state");
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [mapUnlockAt, socket]);
  if (left <= 0) return null;
  return (
    <span className="rounded-full bg-[#FB7185]/20 px-2 py-0.5 text-[10px] font-bold text-[#FB7185]">
      Carte {left}s
    </span>
  );
}
