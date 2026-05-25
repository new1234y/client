import { Circle } from "react-leaflet";

export default function GlobalCircle({ center, radius }) {
  if (!center || radius == null) return null;

  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color: "#6366f1",
        fillColor: "#818cf8",
        fillOpacity: 0.08,
        weight: 4,
        className: "global-zone-circle",
      }}
      style={{
        filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))",
      }}
    />
  );
}
