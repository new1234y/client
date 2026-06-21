import { useEffect, useRef, useState, useCallback } from "react";

// Haversine distance in meters
function distanceM(lat1, lng1, lat2, lng2) {
  console.log('[distanceM] Called with:', { lat1, lng1, lat2, lng2 });
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const result = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  console.log('[distanceM] Result:', result);
  return result;
}

// Buffer zone: only update if user moves more than BUFFER_M from last reported position
const BUFFER_M = 8;

export function useGeolocation(enabled, opts = {}) {
  const { forceUpdate = false } = opts;
  console.log('[useGeolocation] Called with:', { enabled, forceUpdate });
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);
  const lastReported = useRef(null);
  const retryTimeoutRef = useRef(null);

  const clearWatch = useCallback(() => {
    console.log('[clearWatch] Called');
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      console.log('[clearWatch] Watch cleared');
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    console.log('[useGeolocation] Requesting location');
    if (!navigator.geolocation) {
      console.log('[useGeolocation] Geolocation not available');
      setError({
        code: "NO_API",
        message: "La géolocalisation n'est pas disponible sur cet appareil.",
      });
      return;
    }

    const onOk = (pos) => {
      console.log('[useGeolocation] Position received:', pos);
      setError(null);
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      const acc = pos.coords.accuracy;

      // Always update position on first receive (no lastReported yet)
      if (!lastReported.current) {
        lastReported.current = { lat: newLat, lng: newLng };
        const newPosition = {
          lat: newLat,
          lng: newLng,
          accuracy: acc,
        };
        console.log('[useGeolocation] First position set:', newPosition);
        setPosition(newPosition);
        return;
      }

      // Buffer zone: don't update if still within buffer of last reported
      const d = distanceM(
        lastReported.current.lat,
        lastReported.current.lng,
        newLat,
        newLng
      );
      // If forceUpdate is true (e.g. player currently out of the safe zone)
      // we bypass the buffer so position updates more eagerly.
      if (d < BUFFER_M && !forceUpdate) {
        console.log('[useGeolocation] Position within buffer, not updating');
        return; // stay at last reported position
      }

      lastReported.current = { lat: newLat, lng: newLng };
      const newPosition = {
        lat: newLat,
        lng: newLng,
        accuracy: acc,
      };
      console.log('[useGeolocation] Position updated:', newPosition);
      setPosition(newPosition);
    };

    const onErr = (err) => {
      console.log('[useGeolocation] Error:', err);
      const messages = {
        1: "Accès à la position refusé. Activez le GPS dans les paramètres.",
        2: "Position indisponible.",
        3: "Délai de localisation dépassé.",
      };
      setError({
        code: err.code,
        message: messages[err.code] || err.message || "Erreur de géolocalisation.",
      });

      // Auto-retry on permission denied (code 1) - but with exponential backoff
      if (err.code === 1 && enabled) {
        console.log('[useGeolocation] Permission denied, will retry on next check');
        // Don't auto-retry immediately - let the user enable permission first
        // The useEffect will re-trigger when enabled changes
      }
    };

  console.log('[useGeolocation] Starting watchPosition');
  watchId.current = navigator.geolocation.watchPosition(onOk, onErr, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 20000,
    });
  }, [enabled]);

  useEffect(() => {
    console.log('[useGeolocation] useEffect triggered, enabled:', enabled);
    if (!enabled) {
      console.log('[useGeolocation] Not enabled, clearing watch');
      clearWatch();
      return;
    }

    // Clear any existing watch before starting a new one
    clearWatch();
    
    // Small delay to ensure clean state
    const timeoutId = setTimeout(() => {
      requestLocation();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      clearWatch();
    };
  }, [enabled, clearWatch, requestLocation]);

  return { position, error, clearWatch };
}
