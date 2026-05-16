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
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 shadow-card">
      <span className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-[var(--color-border)] text-brand-blue focus:ring-2 focus:ring-brand-blue"
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
    <div className="flex min-h-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="shrink-0 border-b border-[var(--color-border)] px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Recap</h1>
            <p className="font-mono text-lg font-semibold text-brand-blue">
              {summary.code}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {zoneMode === "city" ? "Zone : contours ville" : "Zone : cercle"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={!publicRecapUrl && !shareBusy}
              className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white shadow-card disabled:opacity-50"
            >
              {shareBusy ? "..." : "Partager"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)]"
            >
              {theme === "dark" ? "Clair" : "Sombre"}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-3xl rounded-xl bg-[var(--color-bg-raised)] p-4 shadow-card ring-1 ring-[var(--color-border)]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white"
            >
              {playing ? "Pause" : "Lecture"}
            </button>
            <button
              type="button"
              onClick={() => setOffsetMs(0)}
              className="rounded-lg bg-[var(--color-bg-overlay)] px-3 py-2 text-sm font-semibold text-[var(--color-text)]"
            >
              Debut
            </button>
            <span className="text-xs text-[var(--color-text-muted)]">Vitesse x{speed}</span>
            <input
              type="range"
              min={2}
              max={40}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="h-2 w-24 accent-brand-blue"
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={500}
            value={Math.min(duration, offsetMs)}
            onChange={(e) => setOffsetMs(Number(e.target.value))}
            className="mt-3 w-full accent-brand-blue"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-[var(--color-text-muted)]">
            <span>{formatClock(absT)}</span>
            <span>
              {formatDur(offsetMs)} / {formatDur(duration)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap gap-2 border-b border-[var(--color-border)] px-4 py-2">
        {Object.entries(BASEMAPS).map(([id, b]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBasemapId(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              basemapId === id
                ? "bg-brand-blue text-white"
                : "bg-[var(--color-bg-overlay)] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-3xl shrink-0 grid-cols-1 gap-3 p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-faint)]">
            Joueurs
          </p>
          {players.map((p) => (
            <label
              key={p.sessionId}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 shadow-card"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: summary.colors?.[p.sessionId] || "#94a3b8",
                  }}
                />
                <span className="truncate text-sm font-medium text-[var(--color-text)]">
                  {p.nickname}
                </span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 rounded border-[var(--color-border)] text-brand-blue focus:ring-2 focus:ring-brand-blue"
                checked={!!visible[p.sessionId]}
                onChange={() => togglePlayer(p.sessionId)}
              />
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-faint)]">
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

      <div className="h-[42vh] min-h-[220px] w-full shrink-0 border-b border-[var(--color-border)]">
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
        <h2 className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-faint)]">
          Chronologie
        </h2>
        <ul className="max-w-3xl space-y-1 border-l-2 border-brand-blue/30 pl-4">
          {timelineSorted.map((ev, i) => (
            <li
              key={i}
              className={`rounded-lg py-1.5 pl-2 ${
                i === activeEventIndex
                  ? "bg-brand-blue-light dark:bg-brand-blue/10"
                  : ""
              }`}
            >
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatClock(ev.t)}
              </span>
              <p className="text-sm">{timelineLabel(ev)}</p>
            </li>
          ))}
        </ul>

        {(summary?.partyChat || []).length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-xs font-semibold uppercase text-[var(--color-text-faint)]">
              Discussion de partie
            </h2>
            <ul className="max-w-3xl space-y-2">
              {[...(summary.partyChat || [])]
                .sort((a, b) => (a.t || 0) - (b.t || 0))
                .map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-2 text-sm"
                  >
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                      {formatClock(m.t)} · {m.nickname}
                    </p>
                    {m.type === "text" && (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[var(--color-text)]">
                        {m.text}
                      </p>
                    )}
                    {m.type === "location" && m.lat != null && m.lng != null && (
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        Position: {Number(m.lat).toFixed(5)}, {Number(m.lng).toFixed(5)}
                      </p>
                    )}
                    {m.type === "image" && m.image && (
                      <div className="mt-1">
                        <img
                          src={m.image}
                          alt=""
                          className="max-h-36 max-w-full rounded-lg border border-[var(--color-border)]"
                        />
                        {m.lat != null && m.lng != null && (
                          <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                            Position: {Number(m.lat).toFixed(5)}, {Number(m.lng).toFixed(5)}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] p-4">
        <button
          type="button"
          onClick={onLeave}
          className="mx-auto block w-full max-w-md rounded-lg bg-brand-blue py-3.5 text-base font-bold text-white"
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
          <div className="w-full max-w-md rounded-xl bg-[var(--color-bg)] p-6 shadow-card-lg ring-1 ring-[var(--color-border)]">
            <h3 className="text-lg font-bold text-[var(--color-text)]">
              Partager le recap
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Lien public (lecture seule). Les donnees restent sur ce serveur
              tant qu&apos;il tourne.
            </p>
            {publicRecapUrl ? (
              <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="rounded-lg bg-white p-2 ring-2 ring-brand-blue/20 dark:bg-navy-800 dark:ring-brand-blue/30">
                  <QRCodeSVG value={publicRecapUrl} size={160} level="M" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-xs text-brand-blue">
                    {publicRecapUrl}
                  </p>
                  <button
                    type="button"
                    onClick={copyRecap}
                    className="mt-3 w-full rounded-lg bg-brand-blue py-2.5 text-sm font-bold text-white sm:w-auto sm:px-5"
                  >
                    {copied ? "Copie" : "Copier le lien"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-brand-yellow-dark dark:text-brand-yellow">
                Lien indisponible (verifiez que le serveur expose{" "}
                <span className="font-mono">/api/recap</span> et le proxy Vite).
              </p>
            )}
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="mt-6 w-full rounded-lg border border-[var(--color-border)] py-3 text-sm font-semibold text-[var(--color-text)]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
