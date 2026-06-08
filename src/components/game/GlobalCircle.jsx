import { Circle } from "react-leaflet";

export default function GlobalCircle({ center, radius, nextCenter, nextRadius }) {
  if (!center || radius == null) return null;

  return (
    <>
      {/* Current Zone */}
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

      {/* Next Zone preview: always show when known, as a yellow dashed circle */}
      {nextCenter && nextRadius != null && (
        <Circle
          center={nextCenter}
          radius={nextRadius}
          pathOptions={{
            color: "#facc15", // jaune pour prévisualiser la prochaine zone
            dashArray: "8, 8",
            fillOpacity: 0,
            weight: 3,
            className: "next-zone-circle animate-pulse",
          }}
        />
      )}
    </>
  );
}
