import { useState } from "react";
import { BASEMAPS } from "../../lib/map/basemaps.js";

// SVG Icons
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
  compass: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
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
};

// Map style icons for each basemap type
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
  satellite: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3L2 12h3v8h14v-8h3L12 3zm4 13h-3v-4h-2v4H8v-6.17l4-3.59 4 3.59V16z"/>
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

  return (
    <div className="pointer-events-none absolute bottom-24 right-3 z-[1000] flex flex-col items-end gap-2">
      {/* Layer selector popup */}
      {showLayers && (
        <div className="pointer-events-auto mb-2 w-40 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Style de carte
            </p>
          </div>
          <div className="p-1.5">
            {Object.entries(BASEMAPS).map(([id, b]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onBasemapChange(id);
                  setShowLayers(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  basemapId === id
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <span className={basemapId === id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}>
                  {mapIcons[id] || mapIcons.osm}
                </span>
                <span className="flex-1 font-medium">{b.name}</span>
                {basemapId === id && (
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {icons.check}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="pointer-events-auto flex flex-col gap-2">
        {/* Recenter button */}
        <button
          type="button"
          onClick={onRecenter}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition-colors active:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:active:bg-slate-800"
          title="Centrer sur moi"
        >
          {icons.location}
        </button>

        {/* Layer toggle */}
        <button
          type="button"
          onClick={() => setShowLayers(!showLayers)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ring-1 transition-colors ${
            showLayers
              ? "bg-indigo-600 text-white ring-indigo-600"
              : "bg-white text-slate-700 ring-slate-200 active:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:active:bg-slate-800"
          }`}
          title="Changer le style de carte"
        >
          {icons.layers}
        </button>

        {/* Zoom controls */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
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
