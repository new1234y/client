import { Circle } from "react-leaflet";

export default function PlayerCircle({ center, radius, color, fillColor, fillOpacity, eventHandlers }) {
  if (!center || radius == null) return null;

  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color: color || "#0ea5e9",
        fillColor: fillColor || "#38bdf8",
        fillOpacity: fillOpacity || 0.15,
        weight: 3,
        // No dashArray - solid line
        className: "player-jam-circle",
      }}
      eventHandlers={eventHandlers}
      style={{
        filter: "drop-shadow(0 0 6px rgba(14, 165, 233, 0.25))",
      }}
    />
  );
}
