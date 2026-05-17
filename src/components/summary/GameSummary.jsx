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
  Polygon,
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
  zoneModeFromSummary,
  cityPolygonsFromSummary,
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
  const zoneMode = zoneModeFromSummary(summary);
  const cityPolys = cityPolygonsFromSummary(summary);

  const center = useMemo(() => {
    const gc = summary?.gameCenter;
    if (gc) return [gc.lat, gc.lng];
    const first = Object.values(summary?.paths || {})[0];
    if (first?.length) return [first[0].lat, first[0].lng];
    return [46.8, 2.5];
  }, [summary]);

  const zoneR = useMemo(() => {
    if (!summary || zoneMode !== "circle") return 0;
    const r = effectiveGlobalRadiusAtTime(summary, absT);
    return r > 0 ? r : 0;
  }, [summary, absT, zoneMode]);

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
    if (!summary || !showJam || zoneMode === "city") return [];
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
  }, [summary, players, visible, absT, showJam, zoneMode]);

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

  if (!summary) return null;

  return (
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
            zoneMode === "circle" &&
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
          {showZone &&
            zoneMode === "city" &&
            cityPolys.map((ring, idx) => {
              if (!ring?.length) return null;
              return (
                <Polygon
                  key={`z-${idx}`}
                  positions={ring.map(([lat, lng]) => [lat, lng])}
                  pathOptions={{
                    color: "#5B7FA5",
                    weight: 2,
                    fillColor: "#818cf8",
                    fillOpacity: 0.07,
                  }}
                />
              );
            })}
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
            className="pointer-events-auto rounded-[8px] bg-[#5B7FA5] px-3 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {shareBusy ? "…" : "Partager"}
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
            onClick={onLeave}
            className="pointer-events-auto rounded-[8px] bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg backdrop-blur dark:bg-slate-900/95 dark:text-slate-200"
          >
            Retour
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
                label={zoneMode === "city" ? "Contours de zone" : "Zone (cercle + paliers)"}
                checked={showZone}
                onChange={setShowZone}
              />
              {zoneMode === "circle" && (
                <ToggleRow
                  label="Brouillage (cercle par proie)"
                  checked={showJam}
                  onChange={setShowJam}
                />
              )}
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#5B7FA5] text-white shadow disabled:opacity-40"
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
            className="flex h-10 shrink-0 items-center justify-center rounded-[8px] bg-[#E2C96D] px-3 text-sm font-bold text-slate-900 shadow"
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
                <div className="rounded-[8px] bg-white p-2 ring-2 ring-[#5B7FA5]/20 dark:bg-slate-800">
                  <QRCodeSVG value={publicRecapUrl} size={160} level="M" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-xs text-[#5B7FA5]">{publicRecapUrl}</p>
                  <button
                    type="button"
                    onClick={copyRecap}
                    className="mt-3 w-full rounded-[8px] bg-[#5B7FA5] py-2.5 text-sm font-semibold text-white sm:w-auto sm:px-5"
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
    </div>
  );
}
