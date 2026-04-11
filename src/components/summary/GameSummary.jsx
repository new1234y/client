import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "../../context/ThemeContext.jsx";
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
    case "game_over":
      return ev.message || "Fin de partie";
    default:
      return ev.message || ev.type;
  }
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-800/90">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-900"
      />
    </label>
  );
}

export default function GameSummary({ summary, onLeave, readOnlyRecap }) {
  const { theme, toggleTheme } = useTheme();
  const [basemapId, setBasemapId] = useState("dark");
  const [offsetMs, setOffsetMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(12);
  const [showZone, setShowZone] = useState(true);
  const [showJam, setShowJam] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [publicRecapUrl, setPublicRecapUrl] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const publishOnce = useRef(false);

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
    <div className="flex min-h-full flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Récap</h1>
            <p className="font-mono text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {summary.code}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {zoneMode === "city" ? "Zone : contours ville" : "Zone : cercle"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={!publicRecapUrl && !shareBusy}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {shareBusy ? "…" : "Partager"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium dark:border-slate-600 dark:bg-slate-800"
            >
              {theme === "dark" ? "Clair" : "Sombre"}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-3xl rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
            >
              {playing ? "Pause" : "Lecture"}
            </button>
            <button
              type="button"
              onClick={() => setOffsetMs(0)}
              className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold dark:bg-slate-800"
            >
              Début
            </button>
            <span className="text-xs text-slate-500">Vitesse ×{speed}</span>
            <input
              type="range"
              min={2}
              max={40}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="h-2 w-24 accent-indigo-600"
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={500}
            value={Math.min(duration, offsetMs)}
            onChange={(e) => setOffsetMs(Number(e.target.value))}
            className="mt-3 w-full accent-indigo-600"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-slate-500">
            <span>{formatClock(absT)}</span>
            <span>
              {formatDur(offsetMs)} / {formatDur(duration)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
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

      <div className="mx-auto grid w-full max-w-3xl shrink-0 grid-cols-1 gap-3 p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Joueurs
          </p>
          {players.map((p) => (
            <label
              key={p.sessionId}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-800/90"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: summary.colors?.[p.sessionId] || "#94a3b8",
                  }}
                />
                <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {p.nickname}
                </span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-500 dark:bg-slate-900"
                checked={!!visible[p.sessionId]}
                onChange={() => togglePlayer(p.sessionId)}
              />
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Calques
          </p>
          <ToggleRow
            label={
              zoneMode === "city"
                ? "Contours de zone"
                : "Zone (cercle + paliers)"
            }
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
      </div>

      <div className="h-[42vh] min-h-[220px] w-full shrink-0 border-b border-slate-200 dark:border-slate-800">
        <MapContainer
          center={center}
          zoom={15}
          className="h-full w-full"
          zoomControl
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
                  color: "#6366f1",
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
                    color: "#6366f1",
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">
          Chronologie
        </h2>
        <ul className="max-w-3xl space-y-1 border-l-2 border-indigo-200 pl-4 dark:border-indigo-900">
          {timelineSorted.map((ev, i) => (
            <li
              key={i}
              className={`rounded-lg py-1.5 pl-2 ${
                i === activeEventIndex
                  ? "bg-indigo-50 dark:bg-indigo-950/60"
                  : ""
              }`}
            >
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
          className="mx-auto block w-full max-w-md rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white"
        >
          Retour
        </button>
      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Partager le récap
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Lien public (lecture seule). Les données restent sur ce serveur
              tant qu&apos;il tourne.
            </p>
            {publicRecapUrl ? (
              <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="rounded-xl bg-white p-2 ring-2 ring-indigo-100 dark:bg-slate-800 dark:ring-indigo-900">
                  <QRCodeSVG value={publicRecapUrl} size={160} level="M" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-xs text-indigo-700 dark:text-indigo-300">
                    {publicRecapUrl}
                  </p>
                  <button
                    type="button"
                    onClick={copyRecap}
                    className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white sm:w-auto sm:px-5"
                  >
                    {copied ? "Copié" : "Copier le lien"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                Lien indisponible (vérifiez que le serveur expose{" "}
                <span className="font-mono">/api/recap</span> et le proxy Vite).
              </p>
            )}
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="mt-6 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-600"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
