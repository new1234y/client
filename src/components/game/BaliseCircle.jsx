import { useEffect, useRef, useState } from "react";
import { Circle, CircleMarker, Marker, Popup } from "react-leaflet";
import L from "leaflet";

function baliseIcon(sizePx, color) {
  return L.divIcon({
    className: "balise-marker-icon",
    html: `<div style="width:${sizePx}px;height:${sizePx}px;border-radius:14px;background:linear-gradient(145deg,${color},#4c1d95);border:3px solid white;box-shadow:0 0 0 4px rgba(168,85,247,.25),0 8px 24px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:white;font:900 ${Math.max(14, sizePx * 0.42)}px/1 system-ui">⌖</div>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
  });
}

export default function BaliseCircle({ center, radius, visualScale, beingCapturedBy, isMyCapture, captureProgress }) {
  const [rotation, setRotation] = useState(0);
  const [pulse, setPulse] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    const animate = () => {
      setRotation((prev) => (prev + 2) % 360);
      setPulse((prev) => (prev + 0.05) % (Math.PI * 2));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!center || radius == null) return null;

  const captureRatio = captureProgress / 30000; // 30 seconds
  const isBeingCaptured = beingCapturedBy !== null;
  const markerSize = Math.round(26 * Math.max(0.75, Math.min(1.9, Number(visualScale) || radius / 30)));
  
  // Color based on capture state
  const color = isBeingCaptured 
    ? (isMyCapture ? "#22c55e" : "#f97316") 
    : "#a855f7";
  const fillColor = isBeingCaptured
    ? (isMyCapture ? "#86efac" : "#fdba74")
    : "#d8b4fe";

  // Pulsing opacity
  const pulseOpacity = 0.2 + Math.sin(pulse) * 0.1;

  return (
    <>
      {/* Outer rotating ring */}
      <Circle
        center={center}
        radius={radius * 1.3}
        pathOptions={{
          color: color,
          fill: false,
          weight: 2,
          opacity: 0.4,
          dashArray: "8 4",
          className: "balise-outer-ring",
        }}
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center",
        }}
      />

      {/* Main circle */}
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: color,
          fillColor: fillColor,
          fillOpacity: isBeingCaptured ? 0.35 : pulseOpacity,
          weight: isBeingCaptured ? 3 : 2,
          className: "balise-main-circle",
        }}
      />

      {/* Inner rotating dashed ring */}
      <Circle
        center={center}
        radius={radius * 0.7}
        pathOptions={{
          color: color,
          fill: false,
          weight: 2,
          opacity: 0.6,
          dashArray: "4 4",
          className: "balise-inner-ring",
        }}
        style={{
          transform: `rotate(${-rotation * 1.5}deg)`,
          transformOrigin: "center",
        }}
      />

      {/* Center blinking dot */}
      <Marker center={center} position={center} icon={baliseIcon(markerSize, color)}>
        <Popup>
          <div className="text-xs">
            <strong>Balise</strong>
            <br />
            Rayon : {Math.round(radius)} m
          </div>
        </Popup>
      </Marker>

      {/* Capture progress indicator */}
      {isBeingCaptured && (
        <CircleMarker
          center={center}
          radius={radius * (1 - captureRatio * 0.5)}
          pathOptions={{
            color: isMyCapture ? "#22c55e" : "#f97316",
            fillColor: isMyCapture ? "#86efac" : "#fdba74",
            fillOpacity: 0.3,
            weight: 2,
            className: "balise-progress-ring",
          }}
        />
      )}
    </>
  );
}
