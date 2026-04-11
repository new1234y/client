import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
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

function effectiveRadiusAt(summary, absT) {
  const R0 = summary.globalRadiusM;
  const s = summary.settingsSnapshot || {};
  if (!s.shrinkZoneEnabled || !summary.huntStartedAt) return R0;
  const durMs =
    Math.max(1, Number(s.shrinkDurationMinutes) || 15) * 60 * 1000;
  const Rmin = Math.min(
    R0,
    Math.max(20, Number(s.shrinkMinRadiusM) || 80)
  );
  const elapsed = absT - summary.huntStartedAt;
  if (elapsed <= 0) return R0;
  const u = Math.min(1, Math.max(0, elapsed / durMs));
  return R0 + (Rmin - R0) * u;
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
    case "game_over":
      return ev.message || "Fin de partie";
    default:
      return ev.message || ev.type;
  }
}

export default function GameSummary({ summary, onLeave }) {
  const { theme, toggleTheme } = useTheme();
  const [basemapId, setBasemapId] = useState("dark");
  const [offsetMs, setOffsetMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(12);
  const [showZone, setShowZone] = useState(true);
  const [showJam, setShowJam] = useState(true);
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

  const zoneR = useMemo(
    () => (summary ? effectiveRadiusAt(summary, absT) : 0),
    [summary, absT]
  );

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
      const next = Math.min(duration, offsetRef.current + dt * speed);
      setOffsetMs(next);
      if (next >= duration) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, speed]);

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
    const jam = summary.jamHistory || [];
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

  if (!summary) return null;

  return (
    <div className="flex min-h-full flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Récap animé</h1>
            <p className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
              {summary.code}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Fais défiler le temps : un seul cercle &quot;vision chat&quot; par
              joueur à l’instant T. Légende et filtres ci‑dessous.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800"
          >
            {theme === "dark" ? "☀️ Clair" : "🌙 Sombre"}
          </button>
        </div>

        <div className="mt-4 space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
            >
              {playing ? "Pause" : "Lecture"}
            </button>
            <button
              type="button"
              onClick={() => setOffsetMs(0)}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold dark:bg-slate-800"
            >
              Début
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Vitesse ×{speed}
            </span>
            <input
              type="range"
              min={2}
              max={40}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={500}
            value={Math.min(duration, offsetMs)}
            onChange={(e) => setOffsetMs(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>{formatClock(absT)}</span>
            <span>
              {formatDur(offsetMs)} / {formatDur(duration)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 p-2 dark:border-slate-800">
        {Object.entries(BASEMAPS).map(([id, b]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBasemapId(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              basemapId === id
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="grid max-h-[40vh] min-h-[200px] shrink-0 grid-cols-1 gap-2 overflow-auto border-b border-slate-200 p-3 text-sm dark:border-slate-800 md:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <p className="text-xs font-bold uppercase text-slate-500">
            Joueurs visibles
          </p>
          {players.map((p) => (
            <label
              key={p.sessionId}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={!!visible[p.sessionId]}
                onChange={() => togglePlayer(p.sessionId)}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: summary.colors?.[p.sessionId] || "#94a3b8",
                }}
              />
              {p.nickname}
            </label>
          ))}
        </div>
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <p className="text-xs font-bold uppercase text-slate-500">
            Calques
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showZone}
              onChange={(e) => setShowZone(e.target.checked)}
            />
            Zone de jeu (rétrécissement si activé en partie)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showJam}
              onChange={(e) => setShowJam(e.target.checked)}
            />
            Cercles brouillage (instant T)
          </label>
        </div>
      </div>

      <div className="h-[38vh] min-h-[200px] w-full shrink-0 border-b border-slate-200 dark:border-slate-800">
        <MapContainer
          center={center}
          zoom={15}
          className="h-full w-full"
          zoomControl
          scrollWheelZoom
          attributionControl
        >
          <TileLayer key={basemapId} attribution={bm.attribution} url={bm.url} />
          {showZone && summary.gameCenter && zoneR > 0 && (
            <Circle
              center={[summary.gameCenter.lat, summary.gameCenter.lng]}
              radius={zoneR}
              pathOptions={{
                color: "#6366f1",
                fillOpacity: 0.04,
                weight: 2,
                dashArray: "6 6",
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
                fillOpacity: 0.07,
                weight: 1,
                opacity: 0.45,
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
                {m.cap ? " — capturé·e à cet instant" : ""}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
          Chronologie (surlignée selon la position du curseur)
        </h2>
        <ul className="space-y-2 border-l-2 border-indigo-300 pl-4 dark:border-indigo-800">
          {timelineSorted.map((ev, i) => (
            <li
              key={i}
              className={`relative rounded-r-lg py-1 pl-2 transition-colors ${
                i === activeEventIndex
                  ? "bg-indigo-100 dark:bg-indigo-950/80"
                  : ""
              }`}
            >
              <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-xs text-slate-500">
                {formatClock(ev.t)}
              </span>
              <p className="text-sm">{timelineLabel(ev)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onLeave}
          className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white"
        >
          Retour au menu
        </button>
      </div>
    </div>
  );
}
