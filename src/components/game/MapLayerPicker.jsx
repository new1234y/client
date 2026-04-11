import { useState } from "react";
import { BASEMAPS } from "../../lib/map/basemaps.js";

const LayerIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function MapLayerPicker({ currentLayer, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (key) => {
    onChange(key);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Layer picker panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[1000]" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Panel */}
          <div className="absolute bottom-14 right-0 z-[1001] w-72 rounded-xl bg-white p-3 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Style de carte
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BASEMAPS).map(([key, map]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  className={`group relative overflow-hidden rounded-lg transition-all ${
                    currentLayer === key
                      ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900"
                      : "ring-1 ring-slate-200 hover:ring-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={map.thumbnail}
                      alt={map.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Label */}
                  <div className="flex items-center justify-between bg-white px-2 py-1.5 dark:bg-slate-800">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {map.name}
                    </span>
                    {currentLayer === key && (
                      <span className="text-indigo-500">
                        <CheckIcon />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="map-control-btn"
        aria-label="Changer le style de carte"
        aria-expanded={isOpen}
      >
        <span className="text-slate-600 dark:text-slate-300">
          <LayerIcon />
        </span>
      </button>
    </div>
  );
}
