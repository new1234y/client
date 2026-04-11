import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Circle, Popup } from "react-leaflet";
import "../leafletFix.js";
import { BASEMAPS } from "../mapBasemaps.js";

function formatTime(t) {
  return new Date(t).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
  const [basemapId, setBasemapId] = useState("dark");
  const bm = BASEMAPS[basemapId] || BASEMAPS.dark;

  const center = useMemo(() => {
    const gc = summary?.gameCenter;
    if (gc) return [gc.lat, gc.lng];
    const firstPath = Object.values(summary?.paths || {})[0];
    if (firstPath?.length) return [firstPath[0].lat, firstPath[0].lng];
    return [46.8, 2.5];
  }, [summary]);

  const polylines = useMemo(() => {
    const out = [];
    const paths = summary?.paths || {};
    const colors = summary?.colors || {};
    for (const [sid, pts] of Object.entries(paths)) {
      if (!pts || pts.length < 2) continue;
      const latlngs = pts.map((p) => [p.lat, p.lng]);
      out.push({
        sessionId: sid,
        color: colors[sid] || "#94a3b8",
        positions: latlngs,
      });
    }
    return out;
  }, [summary]);

  const jamDisplay = useMemo(() => {
    const jh = summary?.jamHistory || [];
    const step = Math.max(1, Math.floor(jh.length / 400));
    return jh.filter((_, i) => i % step === 0);
  }, [summary]);

  const legend = useMemo(() => {
    const colors = summary?.colors || {};
    const players = summary?.players || [];
    return players.map((p) => ({
      ...p,
      color: colors[p.sessionId] || "#94a3b8",
    }));
  }, [summary]);

  if (!summary) return null;

  return (
    <div className="flex min-h-full flex-col bg-slate-950">
      <header className="shrink-0 border-b border-slate-800 p-4">
        <h1 className="text-xl font-bold text-white">Récapitulatif</h1>
        <p className="font-mono text-sm text-indigo-400">{summary.code}</p>
        <p className="text-xs text-slate-500">
          Parcours précis (points GPS) · Cercles = vision chat (approximation
          dans le temps)
        </p>
      </header>

      <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-800 p-2">
        {Object.entries(BASEMAPS).map(([id, b]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBasemapId(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              basemapId === id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="h-[42vh] min-h-[220px] w-full shrink-0 border-b border-slate-800">
        <MapContainer
          center={center}
          zoom={15}
          className="h-full w-full"
          zoomControl
          scrollWheelZoom
          attributionControl
        >
          <TileLayer key={basemapId} attribution={bm.attribution} url={bm.url} />
          {summary.gameCenter && summary.globalRadiusM != null && (
            <Circle
              center={[summary.gameCenter.lat, summary.gameCenter.lng]}
              radius={summary.globalRadiusM}
              pathOptions={{
                color: "#6366f1",
                fillOpacity: 0.05,
                weight: 2,
                dashArray: "4 6",
              }}
            />
          )}
          {jamDisplay.map((j, i) => (
            <Circle
              key={`jam-${i}-${j.t}`}
              center={[j.center.lat, j.center.lng]}
              radius={j.radiusM}
              pathOptions={{
                color: summary.colors?.[j.sessionId] || "#f97316",
                fillColor: summary.colors?.[j.sessionId] || "#f97316",
                fillOpacity: 0.06,
                weight: 1,
                opacity: 0.35,
              }}
            >
              <Popup>
                {j.nickname} — {formatTime(j.t)}
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
                opacity: 0.85,
                dashArray: "10 8",
              }}
            />
          ))}
        </MapContainer>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-400">Légende</h2>
        <ul className="mb-6 flex flex-wrap gap-2">
          {legend.map((p) => (
            <li
              key={p.sessionId}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-slate-700"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              {p.nickname}
            </li>
          ))}
        </ul>

        <h2 className="mb-2 text-sm font-semibold text-slate-400">
          Chronologie
        </h2>
        <ul className="space-y-2 border-l-2 border-slate-700 pl-4">
          {(summary.timeline || []).map((ev, i) => (
            <li key={i} className="relative text-sm text-slate-300">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-xs text-slate-500">
                {formatTime(ev.t)}
              </span>
              <p>{timelineLabel(ev)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-slate-800 p-4">
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
