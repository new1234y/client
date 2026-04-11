import MapLayerPicker from "./MapLayerPicker.jsx";

const LocateIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const CrosshairIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
  </svg>
);

export default function MapControls({ 
  currentLayer, 
  onLayerChange, 
  onRecenter,
  showRecenter = true 
}) {
  return (
    <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
      {showRecenter && (
        <button
          type="button"
          onClick={onRecenter}
          className="map-control-btn"
          aria-label="Recentrer la carte sur ma position"
        >
          <span className="text-indigo-600 dark:text-indigo-400">
            <CrosshairIcon />
          </span>
        </button>
      )}
      
      <MapLayerPicker 
        currentLayer={currentLayer} 
        onChange={onLayerChange} 
      />
    </div>
  );
}
