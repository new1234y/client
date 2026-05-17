import { useEffect, useRef, useState, useCallback } from "react";

// Haversine distance in meters
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Buffer zone: only update if user moves more than BUFFER_M from last reported position
const BUFFER_M = 8;

export function useGeolocation(enabled) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);
  const lastReported = useRef(null);

  const clearWatch = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearWatch();
      return;
    }
    if (!navigator.geolocation) {
      setError({
        code: "NO_API",
        message: "La géolocalisation n'est pas disponible sur cet appareil.",
      });
      return;
    }

    const onOk = (pos) => {
      setError(null);
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      const acc = pos.coords.accuracy;

      // Buffer zone: don't update if still within buffer of last reported
      if (lastReported.current) {
        const d = distanceM(
          lastReported.current.lat,
          lastReported.current.lng,
          newLat,
          newLng
        );
        if (d < BUFFER_M) {
          return; // stay at last reported position
        }
      }

      lastReported.current = { lat: newLat, lng: newLng };
      setPosition({
        lat: newLat,
        lng: newLng,
        accuracy: acc,
      });
    };

    const onErr = (err) => {
      const messages = {
        1: "Accès à la position refusé. Activez le GPS dans les paramètres.",
        2: "Position indisponible.",
        3: "Délai de localisation dépassé.",
      };
      setError({
        code: err.code,
        message: messages[err.code] || err.message || "Erreur de géolocalisation.",
      });
    };

    watchId.current = navigator.geolocation.watchPosition(onOk, onErr, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 20000,
    });

    return clearWatch;
  }, [enabled, clearWatch]);

  return { position, error, clearWatch };
}
