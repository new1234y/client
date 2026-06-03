import { Circle } from "react-leaflet";

export default function GlobalCircle({ center, radius, nextCenter, nextRadius, player = null, hideNextWhenInside = true }) {
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
      
      {/* Next Zone (if it exists) */}
      {nextCenter && nextRadius != null && (() => {
        if (!hideNextWhenInside || !player || player.lat == null || player.lng == null) {
          return true;
        }
        const R = 6371000;
        const dLat = ((nextCenter.lat - player.lat) * Math.PI) / 180;
        const dLon = ((nextCenter.lng - player.lng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((player.lat * Math.PI) / 180) * Math.cos((nextCenter.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist > nextRadius;
      })() && (
        <Circle
          center={nextCenter}
          radius={nextRadius}
          pathOptions={{
            color: "#10b981", // green to indicate safe next zone
            dashArray: "10, 10",
            fillOpacity: 0,
            weight: 3,
            className: "next-zone-circle animate-pulse",
          }}
        />
      )}
    </>
  );
}
