import { useEffect, useState } from "react";
import GameTimer from "./GameTimer.jsx";
import GameStatusModal from "./GameStatusModal.jsx";
import AnimatedGameNotification from "./AnimatedGameNotification.jsx";

const JAM_LABELS = { small: "Petit", normal: "Moyen", large: "Grand" };

function JamPill({ jamLevel }) {
  return (
    <div className="flex items-center gap-1">
      {["small", "normal", "large"].map((lvl) => {
        const active = lvl === jamLevel;
        return (
          <span
            key={lvl}
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-500 border-slate-300"
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
  gameStartedAt,
  timeLimitEndsAt,
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

  // If we have a global time limit and game start, estimate per-phase start times
  let perPhaseStarts = null;
  if (gameStartedAt && timeLimitEndsAt && phases > 0) {
    const total = Math.max(1, timeLimitEndsAt - gameStartedAt);
    const dur = total / phases;
    perPhaseStarts = Array.from({ length: phases }).map((_, i) => gameStartedAt + i * dur);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-2">
          {Array.from({ length: phases }).map((_, i) => {
            const done = i < phase - 1;
            const active = i === phase - 1;
            return (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  done
                    ? "bg-blue-600"
                    : active
                      ? "animate-pulse bg-blue-400"
                      : "bg-slate-300"
                }`}
              />
            );
          })}
        </div>

        {perPhaseStarts && (
          <div className="flex gap-2 mt-1">
            {perPhaseStarts.map((startTs, i) => {
              const remaining = Math.max(0, Math.ceil((startTs - Date.now()) / 1000));
              const m = Math.floor(remaining / 60);
              const s = remaining % 60;
              const label = remaining <= 0 ? "--:--" : `${m}:${String(s).padStart(2, "0")}`;
              return (
                <div key={i} className="text-[10px] text-slate-500 tabular-nums">
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-3 w-px bg-slate-300" />

      <span className="text-[11px] font-semibold text-slate-700">
        {Math.round(currentRadius)}m
        {nextRadius && nextRadius !== currentRadius && (
          <span className="text-orange-500"> → {Math.round(nextRadius)}m</span>
        )}
      </span>

      {phaseState && (
        <>
          <div className="h-3 w-px bg-slate-300" />
          <span className="text-[10px] font-medium text-slate-500">
            {phaseState === "waiting" && "Attente"}
            {phaseState === "shrinking" && "Rétrécissement"}
            {phaseState === "stopped" && "Arrêté"}
          </span>
        </>
      )}

      {timeLeft != null && timeLeft > 0 && phaseState !== "stopped" && (
        <>
          <div className="h-3 w-px bg-slate-300" />
          <span className="font-mono text-[11px] font-bold text-blue-600">
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
      <div className="mt-2 overflow-hidden rounded-xl bg-blue-600 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
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
          <span className="shrink-0 rounded-full bg-blue-800 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
            {remainingSec}s
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-blue-400">
          <div
            className="h-full rounded-full bg-blue-900 transition-[width] duration-200"
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
      <div className="mt-2 overflow-hidden rounded-xl bg-blue-600 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
              👻 Mode ghost actif
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-blue-400">
              <div
                className="h-full rounded-full bg-blue-900"
                style={{ width: `${Math.max(6, Math.min(100, progress * 100))}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums">{remainingSec}s</span>
          {onGhostCancel && (
            <button
              type="button"
              onClick={onGhostCancel}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-blue-600 border border-slate-300"
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
      <div className="mt-2 overflow-hidden rounded-xl bg-blue-600 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
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
      <div className="mt-2 overflow-hidden rounded-xl bg-blue-600 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
        <p className="text-[10px] font-bold uppercase tracking-wider">Cercle de brouillage</p>
        <p className="text-[11px] font-semibold">
          Zone {effect.label} — rayon ~{Math.round(effect.radiusM)}m
        </p>
      </div>
    );
  }

  if (effect.kind === "balise_lure") {
    return (
      <div className="mt-2 overflow-hidden rounded-xl bg-blue-600 px-3 py-2 text-white animate-[slideDown_0.25s_ease-out]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <p className="text-[11px] font-semibold">
            Touchez la carte pour placer le leurre
          </p>
        </div>
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
  gameStartedAt = null,
  onRoleModalOpen = null,
  onZoneModalOpen = null,
  onGameModalOpen = null,
  coins = 0,
  onCoinsModalOpen = null,
  onPlayerModalOpen = null,
}) {
  const [baliseLeft, setBaliseLeft] = useState(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [zoneTimeLeft, setZoneTimeLeft] = useState(null);
  const baliseTarget = baliseExpiresAt || nextBaliseAt;
  const roleColor = role === "cat" ? "text-[#FB7185]" : "text-[#60A5FA]";
  const roleLabel = role === "cat" ? "Chat" : role === "player" ? "Joueur" : "—";
  const roleIcon = role === "cat" ? "🐱" : role === "player" ? "🏃" : "👁️";

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

  useEffect(() => {
    if (!gameStartedAt || !timeLimitEndsAt) {
      setTotalProgress(0);
      return;
    }
    const tick = () => {
      const total = timeLimitEndsAt - gameStartedAt;
      const elapsed = Date.now() - gameStartedAt;
      setTotalProgress(Math.min(1, Math.max(0, elapsed / total)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameStartedAt, timeLimitEndsAt]);

  useEffect(() => {
    // Show time remaining for current phase state
    const timerTarget =
      phaseState === "waiting" && shrinkStartsAt ? shrinkStartsAt : phaseEndsAt;
    if (!timerTarget) {
      setZoneTimeLeft(null);
      return;
    }
    const tick = () =>
      setZoneTimeLeft(Math.max(0, Math.ceil((timerTarget - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phaseEndsAt, shrinkStartsAt, phaseState]);

  const fmt = (s) => {
    if (s == null) return "--:--";
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const inner = (
    <>
      <GameStatusModal
        timeRemaining={shrinkZoneEnabled ? fmt(zoneTimeLeft) : (gameStartedAt && timeLimitEndsAt ? fmt(Math.max(0, Math.ceil((timeLimitEndsAt - Date.now()) / 1000))) : '--:--')}
        zoneState={shrinkZoneEnabled ? phaseState : null}
        progress={Math.round(totalProgress * 100)}
        coins={coins}
        playerType={role}
        onCoinsClick={() => onCoinsModalOpen?.()}
        onTimerClick={() => shrinkZoneEnabled ? onZoneModalOpen?.() : onGameModalOpen?.()}
        onProgressClick={() => onGameModalOpen?.()}
        onPlayerClick={() => onPlayerModalOpen?.()}
      />

      <AnimatedGameNotification effect={powerEffect} uiNow={powerUiNow} onGhostCancel={onGhostCancel} />
    </>
  );

  // GameStatusModal handles its own positioning and styling
  return <>{inner}</>;
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
