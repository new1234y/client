import { CircleMarker } from "react-leaflet";
import L from "leaflet";

export default function DirectionIndicator({ center, heading }) {
  if (!center || heading == null) return null;

  // Create a custom div icon for the directional indicator
  const directionIcon = L.divIcon({
    className: "direction-indicator-icon",
    html: `
      <div style="
        position: relative;
        width: 60px;
        height: 60px;
        transform: rotate(${heading}deg);
        transform-origin: center center;
      ">
        <!-- Glowing cone/arrow pointing forward -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-bottom: 40px solid rgba(59, 130, 246, 0.6);
          filter: blur(8px);
          opacity: 0.8;
        "></div>
        <!-- Inner brighter cone -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 25px solid rgba(96, 165, 250, 0.8);
          filter: blur(4px);
        "></div>
        <!-- Central bright point -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: rgba(147, 197, 253, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 15px 5px rgba(59, 130, 246, 0.6);
        "></div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });

  return (
    <CircleMarker
      center={center}
      radius={0}
      pathOptions={{
        color: "transparent",
        fillColor: "transparent",
        fillOpacity: 0,
        weight: 0,
      }}
      icon={directionIcon}
    />
  );
}
