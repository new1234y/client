import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "../../context/ThemeContext.jsx";
import SliderWithParticles from "../ui/SliderWithParticles.jsx";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Circle,
  Marker,
  Popup,
} from "react-leaflet";
import "../../lib/map/leafletFix.js";
import { BASEMAPS } from "../../lib/map/basemaps.js";
import {
  iconCat,
  iconAlly,
  iconCaptured,
} from "../../lib/map/icons.js";
import {
  effectiveGlobalRadiusAtTime,
} from "../../lib/recapZone.js";

function formatClock(t) {
  return new Date(t).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDur(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function formatDurationMs(ms) {
  if (ms == null) return "—";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remMinutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return "—";
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

function formatSpeedKmh(speed) {
  if (speed == null || Number.isNaN(speed)) return "—";
  return `${Number(speed).toFixed(1)} km/h`;
}

const CONFETTI_COLORS = [
  "#FACC15",
  "#3B82F6",
  "#FB7185",
  "#F97316",
  "#34D399",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function stringSeed(input) {
  if (!input) return 1337;
  let out = 0;
  for (let i = 0; i < input.length; i++) {
    out = (out + input.charCodeAt(i) * (i + 11)) % 100000;
  }
  return out || 1337;
}

const CONFETTI_KEYFRAMES = `
@keyframes confettiFall {
  0% { transform: translate3d(var(--x,0), -10vh, 0) rotate(0deg); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translate3d(calc(var(--x,0) + var(--drift,0) * 20vw), 110vh, 0) rotate(540deg); opacity: 0; }
}
`;

function ConfettiField({ seed }) {
  const pieces = useMemo(() => {
    const rng = seededRandom(stringSeed(String(seed || "podium")));
    return Array.from({ length: 70 }).map((_, idx) => {
      const left = rng() * 100;
      const size = 6 + rng() * 16;
      const duration = 5 + rng() * 4;
      const delay = -rng() * 6;
      const color = CONFETTI_COLORS[Math.floor(rng() * CONFETTI_COLORS.length)];
      const rounded = rng() > 0.4;
      const drift = (rng() - 0.5) * 2;
      return {
        key: `${idx}-${left.toFixed(2)}`,
        left: `${left}%`,
        size,
        duration,
        delay,
        color,
        rounded,
        drift,
      };
    });
  }, [seed]);

  return (
    <>
      <style>{CONFETTI_KEYFRAMES}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((piece) => (
          <span
            key={piece.key}
            className="absolute block"
            style={{
              left: piece.left,
              top: "-12vh",
              width: `${piece.size}px`,
              height: `${(piece.rounded ? piece.size : piece.size * 0.6).toFixed(2)}px`,
              borderRadius: piece.rounded ? "999px" : "6px",
              backgroundColor: piece.color,
              opacity: 0,
              animation: `confettiFall ${piece.duration}s linear infinite`,
              animationDelay: `${piece.delay}s`,
              position: "absolute",
              transformOrigin: "center",
              "--drift": piece.drift,
              "--x": `${(piece.drift * 10).toFixed(2)}vw`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function PodiumPillar({ place, player, accent }) {
  if (!player) {
    return (
      <div className="flex flex-1 flex-col items-center justify-end gap-2 text-center sm:gap-3">
        <div
          className="w-full rounded-2xl sm:rounded-3xl bg-white/60 p-2 sm:p-4 text-[10px] sm:text-sm font-semibold text-slate-500 shadow-inner"
          style={{ minHeight: place === 1 ? "4rem" : "3rem" }}
        >
          —
        </div>
      </div>
    );
  }
  const crown = place === 1;
  const podiumHeight = place === 1 ? "h-24 sm:h-40" : place === 2 ? "h-20 sm:h-32" : "h-16 sm:h-24";
  const baseColor =
    accent === "sun"
      ? "bg-[#FFD447]"
      : accent === "sky"
      ? "bg-[#60A5FA]"
      : "bg-[#FB7185]";
  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-2 sm:gap-4 text-center">
      <div className="space-y-0.5 sm:space-y-1">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">#{place}</p>
        <div className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-lg font-bold text-slate-800">
          {crown && (
            <span role="img" aria-label="crown" className="text-amber-400 text-sm sm:text-base">
              👑
            </span>
          )}
          <span className="truncate max-w-[8ch] sm:max-w-[11ch] md:max-w-[16ch]">{player.nickname}</span>
        </div>
        <p className="text-[10px] sm:text-xs font-medium text-slate-500">
          {player.catTimeLabel}
        </p>
      </div>
      <div
        className={`w-full rounded-2xl sm:rounded-3xl ${podiumHeight} ${baseColor} shadow-[0_10px_25px_sm:shadow-[0_20px_35px_rgba(0,0,0,0.15)]`}
      >
        <div className="flex h-full items-end justify-center">
          <div className="w-full rounded-t-2xl sm:rounded-t-3xl bg-white/90 py-1 sm:py-2 text-[10px] sm:text-sm font-bold text-slate-700">
            {player.badgeLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryHighlight({ label, value, accent }) {
  const gradient =
    accent === "red"
      ? "from-[#FECACA] via-[#FDBA74] to-[#F97316]"
      : accent === "blue"
      ? "from-[#BFDBFE] via-[#93C5FD] to-[#2563EB]"
      : "from-[#FEF08A] via-[#FACC15] to-[#FB923C]";
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${gradient} px-4 py-3 text-center text-slate-900 shadow-lg`}> 
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700/80">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function SummaryPodiumView({
  summary,
  analytics,
  onLeave,
  onShowStats,
  onShare,
  shareBusy,
  publicRecapUrl,
  copied,
  copyRecap,
}) {
  const players = summary?.players || [];
  const analyticsPlayers = analytics?.players || {};
  const gameAnalytics = analytics?.game || {};
  const gameMode = gameAnalytics.mode || summary?.settingsSnapshot?.gameMode || "tag_swap";
  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.sessionId, p])),
    [players]
  );

  const rankingSource = useMemo(() => {
    if (Array.isArray(gameAnalytics.catTimeRanking) && gameAnalytics.catTimeRanking.length > 0) {
      return gameAnalytics.catTimeRanking;
    }
    return players.map((p) => ({ sessionId: p.sessionId, catTimeMs: analyticsPlayers[p.sessionId]?.catTimeMs ?? p.totalCatTimeMs ?? 0 }));
  }, [gameAnalytics.catTimeRanking, players, analyticsPlayers]);

  const decoratedRanking = useMemo(() => {
    return rankingSource
      .map((row) => {
        const data = playersById[row.sessionId];
        if (!data) return null;
        const analyticsRow = analyticsPlayers[row.sessionId] || {};
        const catTimeMs = analyticsRow.catTimeMs ?? row.catTimeMs ?? data.totalCatTimeMs ?? 0;
        return {
          sessionId: row.sessionId,
          nickname: data.nickname,
          catTimeMs,
          catTimeLabel: catTimeMs != null ? formatDurationMs(catTimeMs) : "—",
          badgeLabel:
            catTimeMs === 0
              ? "Jamais chat !"
              : catTimeMs < 60000
              ? "Éclair"
              : catTimeMs < 180000
              ? "Insaisissable"
              : "Résilient",
          stats: analyticsRow,
        };
      })
      .filter(Boolean);
  }, [rankingSource, playersById, analyticsPlayers]);

  const topThree = decoratedRanking.slice(0, 3);
  const others = decoratedRanking.slice(3);

  const infectionOrder = useMemo(() => {
    const seen = new Set();
    return (gameAnalytics.infectionOrder || [])
      .filter((sid) => {
        if (!playersById[sid] || seen.has(sid)) return false;
        seen.add(sid);
        return true;
      })
      .map((sid) => ({
        sessionId: sid,
        nickname: playersById[sid]?.nickname || sid,
        time: analyticsPlayers[sid]?.catTransitions?.[0] || null,
      }));
  }, [gameAnalytics.infectionOrder, playersById, analyticsPlayers]);

  const lastSurvivor = playersById[gameAnalytics.lastSurvivorSessionId];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-[#FFF5D7] via-white to-[#FDECF4]">
      <ConfettiField seed={summary?.code} />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-8 pt-8 sm:px-8">
        <header className="flex flex-col gap-4 rounded-3xl bg-white/80 px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Résumé de partie</p>
              <h1 className="text-3xl font-black text-slate-900">{summary?.code || "—"}</h1>
              <p className="text-sm font-medium text-slate-500">
                {gameMode === "infection"
                  ? "Mode Infection · Dernier survivant en vedette"
                  : "Mode Tag Swap · Classement par temps passé en chat"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onShare}
                disabled={shareBusy || (!publicRecapUrl && !shareBusy)}
                className="rounded-full bg-[#2563EB] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {shareBusy ? "Partage…" : "Partager"}
              </button>
              {publicRecapUrl && (
                <button
                  type="button"
                  onClick={copyRecap}
                  className="rounded-full border border-[#2563EB]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB] transition hover:bg-[#2563EB]/10"
                >
                  {copied ? "Lien copié" : "Copier le lien"}
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryHighlight label="Durée" value={formatDurationMs(gameAnalytics.durationMs)} accent="gold" />
            <SummaryHighlight label="Distance totale" value={formatDistance(gameAnalytics.totalDistanceMeters)} accent="blue" />
            <SummaryHighlight label="Événements" value={`${gameAnalytics.totalJamEvents || 0} brouillages`} accent="red" />
          </div>
        </header>

        <main className="mt-8 flex-1">
          {gameMode === "infection" ? (
            <div className="flex h-full flex-col items-center gap-8">
              <div className="w-full max-w-xl rounded-3xl bg-white/85 p-8 text-center shadow-[0_25px_45px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-500">Survivant·e</p>
                <h2 className="mt-2 text-4xl font-black text-slate-900">
                  {lastSurvivor ? lastSurvivor.nickname : decoratedRanking[0]?.nickname || "—"}
                </h2>
                <p className="mt-3 text-sm text-slate-500">
                  {lastSurvivor
                    ? "A tenu jusqu'au bout sans devenir chat."
                    : "Dernier joueur en vie introuvable : consultez les stats pour plus de détails."}
                </p>
                {lastSurvivor && (
                  <p className="mt-4 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700">
                    {formatDurationMs(gameAnalytics.durationMs)} de survie
                  </p>
                )}
              </div>
              <div className="w-full max-w-2xl rounded-3xl bg-white/80 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Ordre des joueurs devenus chats
                </h3>
                <ul className="mt-4 space-y-2">
                  {infectionOrder.length > 0 ? (
                    infectionOrder.map((item, idx) => (
                      <li
                        key={item.sessionId}
                        className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FDE68A] font-semibold text-slate-800">
                            {idx + 1}
                          </span>
                          {item.nickname}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.time ? formatClock(item.time) : "—"}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl bg-white/60 px-4 py-3 text-center text-sm text-slate-500">
                      Aucun passage en chat enregistré.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="relative rounded-[40px] bg-white/80 p-8 shadow-[0_40px_60px_rgba(15,23,42,0.08)]">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.5em] text-[#2563EB]">
                  WIN!
                </p>
                <h2 className="mt-2 text-center text-3xl font-black text-slate-900">
                  Classement des meilleurs survivants
                </h2>
                <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-center md:gap-10">
                  <PodiumPillar
                    place={2}
                    player={topThree[1] || topThree[0] || null}
                    accent="sky"
                  />
                  <PodiumPillar
                    place={1}
                    player={topThree[0] || null}
                    accent="sun"
                  />
                  <PodiumPillar
                    place={3}
                    player={topThree[2] || null}
                    accent="rose"
                  />
                </div>
              </div>
              {others.length > 0 && (
                <div className="rounded-3xl bg-white/70 p-6 shadow-[0_25px_45px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Suite du classement
                  </p>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {others.map((player, idx) => (
                      <li
                        key={player.sessionId}
                        className="flex flex-col rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
                      >
                        <span className="flex items-center justify-between font-semibold text-slate-800">
                          <span className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DBEAFE] font-bold text-slate-700">
                              {idx + 4}
                            </span>
                            {player.nickname}
                          </span>
                          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            {player.badgeLabel}
                          </span>
                        </span>
                        <span className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#2563EB]">
                          {player.catTimeLabel}
                        </span>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                          <span>Vitesse max&nbsp;: {formatSpeedKmh(player.stats?.maxSpeedKmh)}</span>
                          <span>Distance&nbsp;: {formatDistance(player.stats?.distanceMeters)}</span>
                          <span>Temps joueur&nbsp;: {formatDurationMs(player.stats?.timeAsPlayerMs)}</span>
                          <span>Brouillages : {player.stats?.jamEvents ?? 0}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-3 bg-white/80 px-6 py-6 shadow-[0_-12px_30px_rgba(15,23,42,0.06)] backdrop-blur">
        <button
          type="button"
          onClick={onLeave}
          className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-slate-700"
        >
          Quitter
        </button>
        <button
          type="button"
          onClick={onShowStats}
          className="rounded-full border border-slate-900/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-800 transition hover:bg-slate-900 hover:text-white"
        >
          Statistiques
        </button>
      </footer>
    </div>
  );
}

function segmentUntil(pts, absT) {
  const out = [];
  for (const p of pts || []) {
    if (p.t > absT) break;
    out.push([p.lat, p.lng]);
  }
  return out.length >= 2 ? out : [];
}

function positionAt(pts, absT) {
  let last = null;
  for (const p of pts || []) {
    if (p.t > absT) break;
    last = p;
  }
  return last ? { lat: last.lat, lng: last.lng } : null;
}

function jamAt(jamHistory, sessionId, absT) {
  let last = null;
  for (const j of jamHistory || []) {
    if (j.sessionId !== sessionId) continue;
    if (j.t > absT) break;
    last = j;
  }
  return last;
}

function capturedAt(sessionId, timeline, absT) {
  for (const ev of timeline || []) {
    if (ev.t > absT) break;
    if (ev.type === "captured" && ev.sessionId === sessionId) return true;
  }
  return false;
}

function timelineLabel(ev) {
  switch (ev.type) {
    case "hunt_started":
      return "Début de la chasse";
    case "captured":
      return `${ev.nickname} capturé·e par ${ev.byNickname || "un chat"}`;
    case "became_cat":
      return `${ev.nickname} est devenu·e chat`;
    case "role_changed":
      return `${ev.nickname} : ${ev.from} → ${ev.to} (admin)`;
    case "admin_role_pick": {
      const r = ev.role === "cat" ? "chat" : "joueur";
      return `${ev.nickname} désigné·e ${r} par l'hôte`;
    }
    case "player_disconnected":
      return `${ev.nickname} s'est déconnecté·e`;
    case "player_reconnected":
      return `${ev.nickname} s'est reconnecté·e`;
    case "game_over":
      return ev.message || "Fin de partie";
    default:
      return ev.message || ev.type;
  }
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-800/90">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-slate-300 dark:border-slate-500 dark:bg-slate-900"
      />
    </label>
  );
}

/* Speed cycle: x1 → x2 → x4 → x1 */
const SPEED_CYCLE = [1, 2, 4];
const SPEED_MULTIPLIERS = { 1: 6, 2: 12, 4: 24 };

export default function GameSummary({ summary, onLeave, readOnlyRecap }) {
  const { theme, toggleTheme } = useTheme();
  const [basemapId, setBasemapId] = useState("dark");
  const [offsetMs, setOffsetMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [showZone, setShowZone] = useState(true);
  const [showJam, setShowJam] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [publicRecapUrl, setPublicRecapUrl] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const publishOnce = useRef(false);

  const displaySpeed = SPEED_CYCLE[speedIdx];
  const internalSpeed = SPEED_MULTIPLIERS[displaySpeed];

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((i) => (i + 1) % SPEED_CYCLE.length);
  }, []);

  const players = summary?.players || [];
  const [visible, setVisible] = useState(() =>
    Object.fromEntries(players.map((p) => [p.sessionId, true]))
  );

  useEffect(() => {
    setVisible((v) => {
      const n = { ...v };
      for (const p of players) {
        if (n[p.sessionId] === undefined) n[p.sessionId] = true;
      }
      return n;
    });
  }, [players]);

  useEffect(() => {
    if (!summary || publishOnce.current) return;
    if (readOnlyRecap) {
      setPublicRecapUrl(window.location.href.split("?")[0]);
      publishOnce.current = true;
      return;
    }
    publishOnce.current = true;
    setShareBusy(true);
    fetch("/api/recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const origin = window.location.origin;
        setPublicRecapUrl(`${origin}/recap/${j.id}`);
      })
      .catch(() => {
        setPublicRecapUrl("");
      })
      .finally(() => setShareBusy(false));
  }, [summary, readOnlyRecap]);

  const bm = BASEMAPS[basemapId] || BASEMAPS.dark;
  const t0 = summary?.huntStartedAt ?? 0;
  const t1 = summary?.endedAt ?? t0;
  const duration = Math.max(1, t1 - t0);
  const absT = t0 + offsetMs;

  const center = useMemo(() => {
    const gc = summary?.gameCenter;
    if (gc) return [gc.lat, gc.lng];
    const first = Object.values(summary?.paths || {})[0];
    if (first?.length) return [first[0].lat, first[0].lng];
    return [46.8, 2.5];
  }, [summary]);

  const zoneR = useMemo(() => {
    if (!summary) return 0;
    const r = effectiveGlobalRadiusAtTime(summary, absT);
    return r > 0 ? r : 0;
  }, [summary, absT]);

  const timelineSorted = useMemo(
    () => [...(summary?.timeline || [])].sort((a, b) => a.t - b.t),
    [summary]
  );

  const activeEventIndex = useMemo(() => {
    let i = -1;
    for (let k = 0; k < timelineSorted.length; k++) {
      if (timelineSorted[k].t <= absT) i = k;
      else break;
    }
    return i;
  }, [timelineSorted, absT]);

  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf;
    const loop = (now) => {
      const dt = now - last;
      last = now;
      const next = Math.min(duration, offsetRef.current + dt * internalSpeed);
      setOffsetMs(next);
      if (next >= duration) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, internalSpeed]);

  const togglePlayer = useCallback((sid) => {
    setVisible((v) => ({ ...v, [sid]: !v[sid] }));
  }, []);

  const polylines = useMemo(() => {
    if (!summary) return [];
    const paths = summary.paths || {};
    const colors = summary.colors || {};
    const out = [];
    for (const p of players) {
      if (!visible[p.sessionId]) continue;
      const pts = paths[p.sessionId];
      const seg = segmentUntil(pts, absT);
      if (seg.length < 2) continue;
      out.push({
        sessionId: p.sessionId,
        color: colors[p.sessionId] || "#94a3b8",
        positions: seg,
      });
    }
    return out;
  }, [summary, players, visible, absT]);

  const markers = useMemo(() => {
    if (!summary) return [];
    const paths = summary.paths || {};
    const tl = summary.timeline || [];
    const out = [];
    for (const p of players) {
      if (!visible[p.sessionId]) continue;
      const pos = positionAt(paths[p.sessionId], absT);
      if (!pos) continue;
      const cap = capturedAt(p.sessionId, tl, absT);
      let icon = p.role === "cat" ? iconCat : iconAlly;
      if (cap) icon = iconCaptured;
      out.push({
        sessionId: p.sessionId,
        nickname: p.nickname,
        position: [pos.lat, pos.lng],
        icon,
        cap,
      });
    }
    return out;
  }, [summary, players, visible, absT]);

  const jamCircles = useMemo(() => {
    if (!summary || !showJam) return [];
    const jam = summary.jamHistory || [];
    const colors = summary.colors || {};
    const out = [];
    for (const p of players) {
      if (!visible[p.sessionId]) continue;
      if (p.role === "cat") continue;
      const j = jamAt(jam, p.sessionId, absT);
      if (!j) continue;
      out.push({
        key: `${p.sessionId}-${j.t}`,
        center: j.center,
        radius: j.radiusM,
        nickname: p.nickname,
        color: colors[p.sessionId] || "#f97316",
      });
    }
    return out;
  }, [summary, players, visible, absT, showJam]);

  const [activeView, setActiveView] = useState("podium");
  const [copied, setCopied] = useState(false);
  const copyRecap = useCallback(async () => {
    if (!publicRecapUrl) return;
    try {
      await navigator.clipboard.writeText(publicRecapUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [publicRecapUrl]);

  const analytics = summary?.analytics || { players: {}, game: {} };

  const downloadStats = useCallback(() => {
    if (!summary) return;
    try {
      const payload = {
        generatedAt: new Date().toISOString(),
        recapCode: summary.code,
        analytics,
        summary,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recap_${summary.code || "partie"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Téléchargement statistiques échoué", e);
    }
  }, [summary, analytics]);

  if (!summary) return null;

  const recapView =
    activeView === "podium" ? (
      <SummaryPodiumView
        summary={summary}
        analytics={analytics}
        onLeave={onLeave}
        onShowStats={() => setActiveView("map")}
        onShare={() => setShareOpen(true)}
        shareBusy={shareBusy}
        publicRecapUrl={publicRecapUrl}
        copied={copied}
        copyRecap={copyRecap}
      />
    ) : (
      <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/* ═══ FULL SCREEN MAP ═══ */}
        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={center}
            zoom={15}
            className="h-full w-full"
            zoomControl={false}
            scrollWheelZoom
            attributionControl
          >
            <TileLayer key={basemapId} attribution={bm.attribution} url={bm.url} />
            {showZone &&
              summary.gameCenter &&
              zoneR > 0 && (
                <Circle
                  center={[summary.gameCenter.lat, summary.gameCenter.lng]}
                  radius={zoneR}
                  pathOptions={{
                    color: "#5B7FA5",
                    fillOpacity: 0.06,
                    weight: 2,
                    dashArray: "8 6",
                  }}
                />
              )}
            {jamCircles.map((c) => (
              <Circle
                key={c.key}
                center={[c.center.lat, c.center.lng]}
                radius={c.radius}
                pathOptions={{
                  color: c.color,
                  fillColor: c.color,
                  fillOpacity: 0.08,
                  weight: 1,
                  opacity: 0.5,
                }}
              >
                <Popup>
                  Brouillage {c.nickname} — {formatClock(absT)}
                </Popup>
              </Circle>
            ))}
            {polylines.map((pl) => (
              <Polyline
                key={pl.sessionId}
                positions={pl.positions}
                pathOptions={{
                  color: pl.color,
                  weight: 3,
                  opacity: 0.88,
                  dashArray: "10 8",
                }}
              />
            ))}
            {markers.map((m) => (
              <Marker key={m.sessionId} position={m.position} icon={m.icon}>
                <Popup>
                  {m.nickname}
                  {m.cap ? " — capturé·e" : ""}
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* ═══ TOP-LEFT OVERLAY: Info + Controls Toggle ═══ */}
          <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-col gap-2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-[8px] bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:bg-slate-900/95">
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Récap</h1>
                <p className="font-mono text-xs font-semibold text-[#5B7FA5]">{summary.code}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPanel(!showPanel)}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/95 shadow-lg backdrop-blur dark:bg-slate-900/95"
            >
              <svg className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>
          </div>

          {/* ═══ TOP-RIGHT OVERLAY: Actions ═══ */}
          <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={!publicRecapUrl && !shareBusy}
              className="pointer-events-auto rounded-[8px] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {shareBusy ? "…" : "Partager"}
            </button>
            <button
              type="button"
              onClick={downloadStats}
              className="pointer-events-auto rounded-[8px] bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur transition hover:bg-slate-100 dark:bg-slate-900/95 dark:text-slate-100"
            >
              Télécharger
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="pointer-events-auto rounded-[8px] bg-white/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur dark:bg-slate-900/95 dark:text-slate-200"
            >
              {theme === "dark" ? "Clair" : "Sombre"}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("podium")}
              className="pointer-events-auto rounded-[8px] bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg backdrop-blur transition hover:bg-slate-200 dark:bg-slate-900/95 dark:text-slate-200"
            >
              Podium
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="pointer-events-auto rounded-[8px] bg-white/95 px-3 py-2 text-xs font-medium text-rose-600 shadow-lg backdrop-blur transition hover:bg-rose-100 dark:bg-slate-900/95 dark:text-rose-300"
            >
              Quitter
            </button>
          </div>

          {/* ═══ COLLAPSIBLE PANEL (Players, Layers, Timeline) ═══ */}
          {showPanel && (
            <div className="absolute bottom-20 left-3 right-3 z-[1000] max-h-[55vh] overflow-auto rounded-[8px] bg-white/95 p-3 shadow-xl backdrop-blur dark:bg-slate-900/95 sm:left-3 sm:right-auto sm:w-80">
            {/* Basemap selector */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {Object.entries(BASEMAPS).map(([id, b]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBasemapId(id)}
                  className={`rounded-[8px] px-2.5 py-1.5 text-xs font-medium ${
                    basemapId === id
                      ? "bg-[#5B7FA5] text-white"
                      : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            {/* Players */}
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">Joueurs</p>
            <div className="mb-3 space-y-1.5">
              {players.map((p) => (
                <label
                  key={p.sessionId}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800/90"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: summary.colors?.[p.sessionId] || "#94a3b8" }}
                    />
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {p.nickname}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-500 dark:bg-slate-900"
                    checked={!!visible[p.sessionId]}
                    onChange={() => togglePlayer(p.sessionId)}
                  />
                </label>
              ))}
            </div>

            {/* Layers */}
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">Calques</p>
            <div className="mb-3 space-y-1.5">
              <ToggleRow
                label="Zone (cercle + paliers)"
                checked={showZone}
                onChange={setShowZone}
              />
              <ToggleRow
                label="Brouillage (cercle par joueur)"
                checked={showJam}
                onChange={setShowJam}
              />
            </div>

            {/* Timeline */}
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">Chronologie</p>
            <ul className="max-h-48 space-y-0.5 overflow-auto border-l-2 border-[#5B7FA5]/30 pl-3">
              {timelineSorted.map((ev, i) => (
                <li
                  key={i}
                  className={`rounded-[8px] py-1 pl-2 ${
                    i === activeEventIndex ? "bg-[#5B7FA5]/10 dark:bg-[#5B7FA5]/20" : ""
                  }`}
                >
                  <span className="text-[10px] text-slate-500">{formatClock(ev.t)}</span>
                  <p className="text-xs">{timelineLabel(ev)}</p>
                </li>
              ))}
            </ul>

            {/* Party chat */}
            {(summary?.partyChat || []).length > 0 && (
              <>
                <p className="mb-1.5 mt-3 text-xs font-semibold uppercase text-slate-500">Discussion</p>
                <ul className="max-h-36 space-y-1.5 overflow-auto">
                  {[...(summary.partyChat || [])]
                    .sort((a, b) => (a.t || 0) - (b.t || 0))
                    .map((m) => (
                      <li
                        key={m.id}
                        className="rounded-[8px] border border-slate-200 bg-white/80 p-2 text-xs dark:border-slate-600 dark:bg-slate-800/80"
                      >
                        <p className="text-[10px] font-semibold text-slate-500">{formatClock(m.t)} · {m.nickname}</p>
                        {m.type === "text" && <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">{m.text}</p>}
                        {m.type === "location" && m.lat != null && m.lng != null && (
                          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                            {Number(m.lat).toFixed(5)}, {Number(m.lng).toFixed(5)}
                          </p>
                        )}
                        {m.type === "image" && m.image && (
                          <img src={m.image} alt="" className="mt-1 max-h-24 rounded-[8px] border border-slate-200 dark:border-slate-600" />
                        )}
                      </li>
                    ))}
                </ul>
              </>
            )}
            </div>
          )}
        </div>

        {/* ═══ BOTTOM TRANSPORT BAR ═══ */}
        <div className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-center gap-2">
            {/* Play button */}
            <button
              type="button"
              onClick={() => {
                if (offsetMs >= duration) setOffsetMs(0);
                setPlaying(true);
              }}
              disabled={playing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#2563EB] text-white shadow disabled:opacity-40"
              title="Lecture"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            {/* Pause button */}
            <button
              type="button"
              onClick={() => setPlaying(false)}
              disabled={!playing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-slate-200 text-slate-700 shadow disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
              title="Pause"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </button>

            {/* Timeline slider */}
            <div className="min-w-0 flex-1">
              <SliderWithParticles
                type="range"
                min={0}
                max={duration}
                step={500}
                value={Math.min(duration, offsetMs)}
                onChange={(e) => setOffsetMs(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Speed cycle button: x1 → x2 → x4 → x1 */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="flex h-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FBBF24] px-3 text-sm font-bold text-slate-900 shadow"
              title="Vitesse de lecture"
            >
              x{displaySpeed}
            </button>
          </div>
          <div className="mt-0.5 flex justify-between px-1 font-mono text-[10px] text-slate-500">
            <span>{formatClock(absT)}</span>
            <span>{formatDur(offsetMs)} / {formatDur(duration)}</span>
          </div>
        </div>
      </div>
    );

  return (
    <>
      {recapView}

      {/* ═══ SHARE MODAL ═══ */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[8px] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Partager le récap</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Lien public (lecture seule). Les données restent sur ce serveur tant qu&apos;il tourne.
            </p>
            {publicRecapUrl ? (
              <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="rounded-[8px] bg-white p-2 ring-2 ring-[#2563EB]/20 dark:bg-slate-800">
                  <QRCodeSVG value={publicRecapUrl} size={160} level="M" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-xs text-[#2563EB]">{publicRecapUrl}</p>
                  <button
                    type="button"
                    onClick={copyRecap}
                    className="mt-3 w-full rounded-[8px] bg-[#2563EB] py-2.5 text-sm font-semibold text-white sm:w-auto sm:px-5"
                  >
                    {copied ? "Copié" : "Copier le lien"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                Lien indisponible (vérifiez que le serveur expose <span className="font-mono">/api/recap</span> et le proxy Vite).
              </p>
            )}
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="mt-6 w-full rounded-[8px] border border-slate-200 py-3 text-sm font-semibold dark:border-slate-600"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
