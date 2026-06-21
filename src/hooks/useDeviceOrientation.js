import { useState, useEffect, useCallback, useRef } from "react";

export function useDeviceOrientation() {
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const listenersAddedRef = useRef(false);
  const savedEventTypeRef = useRef('deviceorientation');
  const savedHandlerRef = useRef(null);

  const handleOrientation = useCallback((event) => {
    console.log('[useDeviceOrientation] handleOrientation called:', {
      webkitCompassHeading: event.webkitCompassHeading,
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      absolute: event.absolute
    });

    let newHeading = null;

    // Try multiple methods to get heading, in order of preference
    // 1) Prefer webkitCompassHeading when provided by some iOS builds
    if (typeof event.webkitCompassHeading === 'number') {
      // iOS Safari specific
      newHeading = event.webkitCompassHeading;
      console.log('[useDeviceOrientation] Using webkitCompassHeading:', newHeading);
    } else if (event.alpha !== null) {
      // Standard DeviceOrientationEvent
      // alpha is rotation around Z axis. Its reference frame depends on the device/browser.
      // Compensate for screen orientation (portrait/landscape) to get a stable heading.
      try {
        const screenAngle = (window.screen && window.screen.orientation && window.screen.orientation.angle) || (typeof window.orientation === 'number' ? window.orientation : 0);
        let alpha = event.alpha;
        // Normalize alpha to 0-360
        alpha = ((alpha % 360) + 360) % 360;
        // Add screen rotation so heading is relative to device upright orientation
        alpha = (alpha + screenAngle) % 360;
        // Convert to compass heading where 0 = north
        newHeading = 360 - alpha;
        console.log('[useDeviceOrientation] Using alpha with screenAngle', screenAngle, '->', newHeading);
      } catch (err) {
        console.log('[useDeviceOrientation] Error computing adjusted alpha:', err);
        newHeading = 360 - event.alpha;
        console.log('[useDeviceOrientation] Fallback alpha ->', newHeading);
      }
    } else if (event.absolute && event.alpha !== null) {
      // When absolute is true, alpha is compass heading
      newHeading = event.alpha;
      console.log('[useDeviceOrientation] Using absolute alpha:', newHeading);
    }

    if (newHeading !== null && !isNaN(newHeading)) {
      // Normalize to 0-360 range
      newHeading = newHeading % 360;
      if (newHeading < 0) newHeading += 360;
      console.log('[useDeviceOrientation] Final heading after normalization:', newHeading);
      setHeading(newHeading);
    } else {
      console.log('[useDeviceOrientation] Could not determine heading from event');
    }
  }, []);

  const handleOrientationAbsolute = useCallback((event) => {
    console.log('[useDeviceOrientation] handleOrientationAbsolute called:', {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      absolute: event.absolute
    });
    // deviceorientationabsolute provides more accurate compass heading
    if (event.alpha !== null) {
      let newHeading = event.alpha;
      // Normalize to 0-360 range
      newHeading = newHeading % 360;
      if (newHeading < 0) newHeading += 360;
      console.log('[useDeviceOrientation] Using absolute alpha:', newHeading);
      setHeading(newHeading);
    } else {
      console.log('[useDeviceOrientation] Could not determine heading from absolute event');
    }
  }, []);

  // Helper to actually attach listeners (idempotent)
  const addListeners = useCallback((eventType, orientationHandler) => {
    if (listenersAddedRef.current) return;
    try {
      window.addEventListener(eventType, orientationHandler);
      if (eventType !== 'deviceorientation') {
        // also add standard event as fallback
        window.addEventListener('deviceorientation', handleOrientation);
      }
      listenersAddedRef.current = true;
      savedEventTypeRef.current = eventType;
      savedHandlerRef.current = orientationHandler;
      console.log('[useDeviceOrientation] Event listeners added:', eventType);
    } catch (err) {
      console.log('[useDeviceOrientation] Failed to add listeners:', err);
      setError(err.message || String(err));
    }
  }, [handleOrientation]);

  // Exposed function to request permission from a user gesture
  const requestPermission = useCallback(async () => {
    console.log('[useDeviceOrientation] requestPermission called by user gesture');
    if (!window.DeviceOrientationEvent) {
      setError('Device orientation not supported');
      return { granted: false, reason: 'unsupported' };
    }

    let eventType = 'deviceorientation';
    let orientationHandler = handleOrientation;
    if ('ondeviceorientationabsolute' in window) {
      eventType = 'deviceorientationabsolute';
      orientationHandler = handleOrientationAbsolute;
      console.log('[useDeviceOrientation] deviceorientationabsolute available');
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        console.log('[useDeviceOrientation] Requesting iOS permission');
        const permission = await DeviceOrientationEvent.requestPermission();
        console.log('[useDeviceOrientation] Permission result:', permission);
        if (permission === 'granted') {
          addListeners(eventType, orientationHandler);
          setNeedsPermission(false);
          return { granted: true };
        }
        setError('Permission denied');
        return { granted: false, reason: 'denied' };
      } catch (err) {
        console.log('[useDeviceOrientation] Permission request error:', err);
        setError(err.message || String(err));
        return { granted: false, reason: 'error', error: err };
      }
    }

    // Non-iOS: attach listeners immediately
    addListeners(eventType, orientationHandler);
    setNeedsPermission(false);
    return { granted: true };
  }, [addListeners, handleOrientation, handleOrientationAbsolute]);

  useEffect(() => {
    console.log('[useDeviceOrientation] useEffect - initializing');
    if (!window.DeviceOrientationEvent) {
      console.log('[useDeviceOrientation] DeviceOrientationEvent not supported');
      setError('Device orientation not supported');
      return;
    }

    // If the browser requires explicit permission via DeviceOrientationEvent.requestPermission,
    // we don't call it automatically (must be a user gesture). Instead expose requestPermission()
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      console.log('[useDeviceOrientation] DeviceOrientationEvent.requestPermission exists - user gesture required');
      setNeedsPermission(true);
      // Do not add listeners here; wait for explicit user call to requestPermission()
      return;
    }

    // Otherwise attach listeners immediately
    let eventType = 'deviceorientation';
    let orientationHandler = handleOrientation;
    if ('ondeviceorientationabsolute' in window) {
      eventType = 'deviceorientationabsolute';
      orientationHandler = handleOrientationAbsolute;
      console.log('[useDeviceOrientation] Using deviceorientationabsolute');
    } else {
      console.log('[useDeviceOrientation] deviceorientationabsolute not available, using deviceorientation');
    }
    addListeners(eventType, orientationHandler);

    return () => {
      console.log('[useDeviceOrientation] Cleanup - removing event listeners');
      try {
        if (savedEventTypeRef.current && savedHandlerRef.current) {
          window.removeEventListener(savedEventTypeRef.current, savedHandlerRef.current);
        }
        window.removeEventListener('deviceorientation', handleOrientation);
      } catch (err) {
        console.log('[useDeviceOrientation] Error during cleanup:', err);
      }
      listenersAddedRef.current = false;
    };
  }, [addListeners, handleOrientation, handleOrientationAbsolute]);

  return { heading, error, needsPermission, requestPermission };
}
