import { useEffect, useRef, useState } from "react";
import { BASEMAPS } from "../../lib/map/basemaps.js";
import { getMapGyro, MAPBOX_STYLES, MAP_PREF_EVENTS } from "../../lib/map/mapPrefs.js";
import { hasMapboxToken, MAPBOX_TOKEN_EVENT } from "../../lib/map/mapboxKey.js";

function shortestArcDelta(fromDeg, toDeg) {
  const from = ((Number(fromDeg) % 360) + 360) % 360;
  const to = ((Number(toDeg) % 360) + 360) % 360;
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

const icons = {
  layers: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  location: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  zoomIn: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
  zoomOut: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  compassNeedle: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 5v6" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 13v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
};

const mapIcons = {
  osm: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  ),
  light: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
    </svg>
  ),
  dark: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49z"/>
    </svg>
  ),
  streets: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" d="M4 20V8l8-4 8 4v12M9 20v-6h6v6" />
    </svg>
  ),
  outdoors: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 18 6-10 4 6 2-3 6 7H3Z" />
    </svg>
  ),
  satellite: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3L2 12h3v8h14v-8h3L12 3zm4 13h-3v-4h-2v4H8v-6.17l4-3.59 4 3.59V16z"/>
    </svg>
  ),
  "3d": (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 18V12m8-4.5L12 12 4 7.5" />
    </svg>
  ),
};

export default function MapControls({
  basemapId,
  onBasemapChange,
  onRecenter,
  onZoomIn,
  onZoomOut,
}) {
  const [showLayers, setShowLayers] = useState(false);
  const [mapbox, setMapbox] = useState(() => hasMapboxToken());
  const [gyroOn, setGyroOn] = useState(() => getMapGyro());
  const [bearing, setBearing] = useState(0);
  const needleRef = useRef(0);

  useEffect(() => {
    const sync = () => {
      setMapbox(hasMapboxToken());
      setGyroOn(getMapGyro());
    };
    const onBearing = (e) => {
      const next = Number(e?.detail);
      if (!Number.isFinite(next)) return;
      const delta = shortestArcDelta(needleRef.current, next);
      needleRef.current += delta;
      setBearing(needleRef.current);
    };
    window.addEventListener(MAPBOX_TOKEN_EVENT, sync);
    window.addEventListener(MAP_PREF_EVENTS.gyro, sync);
    window.addEventListener("storage", sync);
    window.addEventListener(MAP_PREF_EVENTS.bearing, onBearing);
    return () => {
      window.removeEventListener(MAPBOX_TOKEN_EVENT, sync);
      window.removeEventListener(MAP_PREF_EVENTS.gyro, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(MAP_PREF_EVENTS.bearing, onBearing);
    };
  }, []);

  const styles = mapbox ? MAPBOX_STYLES : BASEMAPS;

  return (
    <div className="pointer-events-none absolute bottom-24 right-3 z-[1000] flex flex-col items-end gap-2">
      {showLayers && (
        <div className="pointer-events-auto mb-2 w-44 overflow-hidden rounded-xl bg-white text-slate-950 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Style de carte
            </p>
          </div>
          <div className="p-1.5">
            {Object.entries(styles).map(([id, b]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onBasemapChange(id);
                  setShowLayers(false);
                }}
                className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  basemapId === id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <span className={basemapId === id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}>
                  {mapIcons[id] || mapIcons.osm}
                </span>
                <span className="flex-1 font-medium">{b.name}</span>
                {basemapId === id && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {icons.check}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event(MAP_PREF_EVENTS.compassTap));
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 transition-colors ${
            gyroOn
              ? "bg-blue-600 text-white ring-blue-600"
              : "bg-white/95 text-slate-700 ring-slate-200 active:bg-slate-100 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-slate-700 dark:active:bg-slate-800"
          }`}
          title={gyroOn ? "Désactiver le gyroscope (nord en haut)" : "Activer le suivi gyroscopique"}
          aria-label={gyroOn ? "Désactiver le gyroscope" : "Activer le gyroscope"}
          aria-pressed={gyroOn}
        >
          <span
            className="inline-flex"
            style={{
              transform: `rotate(${-((bearing || 0))}deg)`,
              transition: "transform 0.85s ease-out",
              willChange: "transform",
            }}
          >
            {icons.compassNeedle}
          </span>
        </button>

        <button
          type="button"
          onClick={onRecenter}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-700 ring-1 ring-slate-200 transition-colors active:bg-slate-100 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-slate-700 dark:active:bg-slate-800"
          title="Centrer sur moi"
        >
          {icons.location}
        </button>

        <button
          type="button"
          onClick={() => setShowLayers(!showLayers)}
          className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 transition-colors ${
            showLayers
              ? "bg-blue-600 text-white ring-blue-600"
              : "bg-white/95 text-slate-700 ring-slate-200 active:bg-slate-100 dark:bg-slate-900/95 dark:text-slate-200 dark:ring-slate-700 dark:active:bg-slate-800"
          }`}
          title="Changer le style de carte"
        >
          {icons.layers}
        </button>

        <div className="flex flex-col overflow-hidden rounded-[1.25rem] bg-white/95 ring-1 ring-slate-200 dark:bg-slate-900/95 dark:ring-slate-700">
          <button
            type="button"
            onClick={onZoomIn}
            className="flex h-10 w-11 items-center justify-center border-b border-slate-200 text-slate-700 transition-colors active:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:active:bg-slate-800"
            title="Zoom +"
          >
            {icons.zoomIn}
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            className="flex h-10 w-11 items-center justify-center text-slate-700 transition-colors active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-800"
            title="Zoom -"
          >
            {icons.zoomOut}
          </button>
        </div>
      </div>
    </div>
  );
}
