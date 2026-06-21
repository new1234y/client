import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, useMemo } from "react";
import { haversineMeters } from "../../lib/map/geoOffset.js";

export default function DirectionIndicator({ center, heading, jamRadius = 80, isOutside = false, showUncertaintyAt = 24 }) {
  if (!center || heading == null) return null;

  const map = useMap();
  const [zoom, setZoom] = useState(map ? map.getZoom() : 0);

  useEffect(() => {
    if (!map) return;
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => map.off("zoomend", onZoom);
  }, [map]);

  // Gestion de l'opacité selon le zoom
  const minZoom = 6;
  const maxZoom = 20; 
  const minOpacity = 0.2;
  const opacity = Math.max(minOpacity, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)));

  const directionIcon = useMemo(() => {
    // Calcul dynamique de la taille en pixels du rayon
    let pixelRadius = 45; 
    try {
      const p1 = map.latLngToLayerPoint([center.lat, center.lng]);
      const target = map.latLngToLayerPoint([center.lat + 0.00001, center.lng]);
      const stepMeters = Math.abs(haversineMeters(center.lat, center.lng, center.lat + 0.00001, center.lng));
      const pixelsPerMeter = Math.abs(p1.y - target.y) / stepMeters || 1;
      const basePixelRadius = Math.max(30, Math.min(150, Math.round(pixelsPerMeter * jamRadius)));

      const minZoom = 6;
      const maxZoom = 20; 
      const haloScale = 1 + ((maxZoom - zoom) / (maxZoom - minZoom)) * 1.2;

      pixelRadius = Math.round(basePixelRadius * haloScale);
    } catch (err) {
      // Fallback
    }

    const scaleFactor = isOutside ? 1.1 : 0.9;
    pixelRadius = Math.max(25, Math.min(200, Math.round(pixelRadius * scaleFactor)));

    const size = pixelRadius * 2 + 20;
    const centerXY = size / 2;

    const angleOpening = 50; 
    const startAngle = -90 - angleOpening / 2;
    const endAngle = -90 + angleOpening / 2;

    const rad = Math.PI / 180;
    const x1 = centerXY + pixelRadius * Math.cos(startAngle * rad);
    const y1 = centerXY + pixelRadius * Math.sin(startAngle * rad);
    const x2 = centerXY + pixelRadius * Math.cos(endAngle * rad);
    const y2 = centerXY + pixelRadius * Math.sin(endAngle * rad);

    const pathData = `
      M ${centerXY} ${centerXY}
      L ${x1} ${y1}
      A ${pixelRadius} ${pixelRadius} 0 0 1 ${x2} ${y2}
      Z
    `;

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        
        ${zoom >= showUncertaintyAt ? `
        <svg width="${size}" height="${size}" style="position: absolute; top: 0; left: 0; pointer-events: none; opacity: ${opacity * 0.15};">
          <circle cx="${centerXY}" cy="${centerXY}" r="${pixelRadius}" fill="#4285F4" />
        </svg>
        ` : ''}

        <div style="position: absolute; width: ${size}px; height: ${size}px; transform: rotate(${heading}deg); transform-origin: ${centerXY}px ${centerXY}px; transition: transform 0.2s ease-out;">
          <svg width="${size}" height="${size}" style="pointer-events: none; filter: drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.65));">
            <defs>
              <radialGradient id="coneGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#4285F4" stop-opacity="0.7" />
                <stop offset="30%" stop-color="#4285F4" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#4285F4" stop-opacity="0" />
              </radialGradient>
            </defs>
            <path d="${pathData}" fill="url(#coneGrad)" />
          </svg>
        </div>

      </div>
    `;

    return L.divIcon({
      className: "google-maps-indicator",
      html,
      iconSize: [size, size],
      iconAnchor: [centerXY, centerXY],
    });
  }, [heading, opacity, jamRadius, map, center.lat, center.lng, isOutside, zoom, showUncertaintyAt]);

  return (
    <Marker
      position={[center.lat, center.lng]}
      icon={directionIcon}
      interactive={false}
      zIndexOffset={1000} 
    />
  );
}