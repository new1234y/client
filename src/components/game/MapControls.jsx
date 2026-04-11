import { useEffect, useRef, useState } from "react";
import { BASEMAPS } from "../../lib/map/basemaps.js";

/* ─── Map style thumbnails (simple colored swatches) ─────── */
const MAP_PREVIEWS = {
  osm: { bg: "#e8f4f0", label: "Standard" },
  light: { bg: "#f5f0e8", label: "Clair" },
  dark: { bg: "#1a2433", label: "Sombre" },
  satellite: { bg: "#2d4a1e", label: "Satellite" },
};

/* ─── Icons ─────────────────────────────────────────────── */
function IconLocation() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ─── Control button ─────────────────────────────────────── */
function CtrlBtn({ onClick, active = false, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ring-1 transition-all active:scale-95 ${
        active
          ? "bg-[var(--color-brand)] text-white ring-[var(--color-brand)]"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-750"
      }`}
    >
      {children}
    </button>
  );
}

export default function MapControls({
  basemapId,
  onBasemapChange,
  onRecenter,
  onZoomIn,
  onZoomOut,
}) {
  const [showLayers, setShowLayers] = useState(false);
  const panelRef = useRef(null);

  // Close layer picker when clicking outside
  useEffect(() => {
    if (!showLayers) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowLayers(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showLayers]);

  return (
    /* Positioned bottom-right, above footer (footer ~72px + gap) */
    <div className="pointer-events-none absolute bottom-20 right-3 z-[1000] flex flex-col items-end gap-2">

      {/* ── Layer picker panel ── */}
      {showLayers && (
        <div
          ref={panelRef}
          className="pointer-events-auto mb-1 w-48 animate-fade-in overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
        >
          <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Fond de carte
            </p>
          </div>
          <div className="p-1.5">
            {Object.entries(BASEMAPS).map(([id, b]) => {
              const preview = MAP_PREVIEWS[id] || MAP_PREVIEWS.osm;
              const isActive = basemapId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onBasemapChange(id);
                    setShowLayers(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/50"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {/* Color swatch */}
                  <span
                    className="h-6 w-6 shrink-0 rounded-lg border border-black/10"
                    style={{ background: preview.bg }}
                    aria-hidden="true"
                  />
                  <span
                    className={`flex-1 text-sm font-medium ${
                      isActive
                        ? "text-[var(--color-brand)]"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {b.name}
                  </span>
                  {isActive && (
                    <span className="text-[var(--color-brand)]">
                      <IconCheck />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Buttons stack ── */}
      <div className="pointer-events-auto flex flex-col gap-2">
        {/* Recenter */}
        <CtrlBtn onClick={onRecenter} title="Centrer sur ma position">
          <IconLocation />
        </CtrlBtn>

        {/* Layers toggle */}
        <CtrlBtn
          onClick={() => setShowLayers((v) => !v)}
          active={showLayers}
          title="Changer le fond de carte"
        >
          <IconLayers />
        </CtrlBtn>

        {/* Zoom controls grouped */}
        <div className="flex flex-col overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-600">
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom +"
            className="flex h-11 w-11 items-center justify-center border-b border-slate-200 bg-white text-slate-700 transition-colors active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
          >
            <IconPlus />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom -"
            className="flex h-11 w-11 items-center justify-center bg-white text-slate-700 transition-colors active:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
          >
            <IconMinus />
          </button>
        </div>
      </div>
    </div>
  );
}
