import { useEffect } from "react";
import { remainingSeconds, useServerNow } from "../../hooks/useServerNow.js";
import { formatDurationMs } from "../../lib/format";
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
                : "border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
  const now = useServerNow();
  const timerTarget =
    phaseState === "waiting" && shrinkStartsAt ? shrinkStartsAt : phaseEndsAt;
  const timeLeft = remainingSeconds(timerTarget, now);

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
                      const remaining = Math.max(0, Math.ceil((startTs - now) / 1000));
                      const label = remaining <= 0 ? "--:--" : formatDurationMs(remaining * 1000);
              return (
                <div key={i} className="text-[10px] text-slate-500 tabular-nums">
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />

      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
        {Math.round(currentRadius)}m
        {nextRadius && nextRadius !== currentRadius && (
          <span className="text-orange-500"> → {Math.round(nextRadius)}m</span>
        )}
      </span>

      {phaseState && (
        <>
          <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {phaseState === "waiting" && "Attente"}
            {phaseState === "shrinking" && "Rétrécissement"}
            {phaseState === "stopped" && "Arrêté"}
          </span>
        </>
      )}

      {timeLeft != null && timeLeft > 0 && phaseState !== "stopped" && (
        <>
          <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider">Bruit fantôme</p>
              <p className="truncate text-[11px] font-semibold">
                {effect.by} fait vibrer ({volumeLabel})
              </p>
            </div>
          </div>
            <span className="shrink-0 rounded-full bg-blue-800 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
            {formatDurationMs(remainingSec * 1000)}
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
              Mode ghost actif
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-blue-400">
              <div
                className="h-full rounded-full bg-blue-900"
                style={{ width: `${Math.max(6, Math.min(100, progress * 100))}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums">{formatDurationMs(remainingSec * 1000)}</span>
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v20M4.9 6.5 19 17.5M4.9 17.5 19 6.5"/></svg></span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">Immobilisé</p>
            <p className="text-[11px]">Carte gelée — {formatDurationMs(remainingSec * 1000)} restantes</p>
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg></span>
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
  timeLimitEnabled,
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
  notificationsVisible = true,
}) {
  const now = useServerNow();
  const baliseTarget = baliseExpiresAt || nextBaliseAt;
  const baliseLeft = remainingSeconds(baliseTarget, now);
  const zoneTimerTarget =
    phaseState === "waiting" && shrinkStartsAt ? shrinkStartsAt : phaseEndsAt;
  const zoneTimeLeft = remainingSeconds(zoneTimerTarget, now);
  const totalProgress = (gameStartedAt && timeLimitEndsAt)
    ? Math.min(1, Math.max(0, (now - gameStartedAt) / (timeLimitEndsAt - gameStartedAt)))
    : 0;
  const roleColor = role === "cat" ? "text-[#FB7185]" : "text-[#60A5FA]";
  const roleLabel = role === "cat" ? "Chat" : role === "player" ? "Souris" : "—";
  const roleIcon = role === "cat" ? "chat" : role === "player" ? "souris" : "spec";

  const fmt = (s) => {
    if (s == null) return "--:--";
    const totalMinutes = Math.floor(s / 60);
    const seconds = s % 60;
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
  };

  const inner = (
    <>
      <GameStatusModal
        timeRemaining={gameStartedAt && timeLimitEndsAt ? fmt(Math.max(0, Math.ceil((timeLimitEndsAt - now) / 1000))) : '--:--'}
        zoneTimeRemaining={shrinkZoneEnabled ? fmt(zoneTimeLeft) : null}
        zoneState={shrinkZoneEnabled ? phaseState : null}
        currentPhase={currentPhase}
        totalPhases={totalPhases}
        progress={Math.round(totalProgress * 100)}
        coins={coins}
        playerType={role}
        shrinkZoneEnabled={shrinkZoneEnabled}
        timeLimitEnabled={timeLimitEnabled}
        onCoinsClick={() => onCoinsModalOpen?.()}
        onTimerClick={() => onGameModalOpen?.()}
        onProgressClick={() => shrinkZoneEnabled ? onZoneModalOpen?.() : onGameModalOpen?.()}
        onPlayerClick={() => onPlayerModalOpen?.()}
      />

      <AnimatedGameNotification
        effect={powerEffect}
        uiNow={powerUiNow}
        onGhostCancel={onGhostCancel}
        visible={notificationsVisible}
      />
    </>
  );

  // GameStatusModal handles its own positioning and styling
  return <>{inner}</>;
}

function CatLockBadge({ mapUnlockAt, socket }) {
  const now = useServerNow();
  const left = remainingSeconds(mapUnlockAt, now) || 0;
  useEffect(() => {
    if (left === 0) socket?.emit("refresh_state");
  }, [left, socket]);
  if (left <= 0) return null;
  return (
    <span className="rounded-full bg-[#FB7185]/20 px-2 py-0.5 text-[10px] font-bold text-[#FB7185]">
      Carte {left}s
    </span>
  );
}
