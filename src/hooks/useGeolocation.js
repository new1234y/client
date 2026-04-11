import { useEffect, useRef, useState, useCallback } from "react";

export function useGeolocation(enabled) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

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
      setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
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
