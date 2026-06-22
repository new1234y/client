import { useState, useEffect, useCallback, useRef } from "react";

// Linear interpolation function for smoothing
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

// Smooth angle interpolation (handles 0/360 wraparound)
function lerpAngle(start, end, factor) {
  const diff = end - start;
  const shortestDiff = ((diff + 180) % 360) - 180;
  return (start + shortestDiff * factor + 360) % 360;
}

export function useDeviceOrientation() {
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const listenersAddedRef = useRef(false);
  const savedEventTypeRef = useRef('deviceorientation');
  const savedHandlerRef = useRef(null);
  
  // Check if permission was previously granted
  const [compassPermissionGranted, setCompassPermissionGranted] = useState(() => {
    try {
      return localStorage.getItem('compass_permission_granted') === 'true';
    } catch {
      return false;
    }
  });
  
  // Smoothing state
  const smoothedHeadingRef = useRef(null);
  const lastHeadingUpdateRef = useRef(0);
  const smoothingFactor = 0.15; // Lerp factor for Android (lower = more smoothing)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleOrientation = useCallback((event) => {

    let newHeading = null;

    // Try multiple methods to get heading, in order of preference
    // 1) Prefer webkitCompassHeading when provided by some iOS builds
    if (typeof event.webkitCompassHeading === 'number') {
      // iOS Safari specific
      newHeading = event.webkitCompassHeading;
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
      } catch (err) {
        newHeading = 360 - event.alpha;
      }
    } else if (event.absolute && event.alpha !== null) {
      // When absolute is true, alpha is compass heading
      newHeading = event.alpha;
    }

    if (newHeading !== null && !isNaN(newHeading)) {
      // Normalize to 0-360 range
      newHeading = newHeading % 360;
      if (newHeading < 0) newHeading += 360;
      
      // Apply smoothing for Android devices to prevent micro-oscillations
      if (!isIOS) {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastHeadingUpdateRef.current;
        
        // Only apply smoothing if we have a previous value and updates are frequent
        if (smoothedHeadingRef.current !== null && timeSinceLastUpdate < 100) {
          newHeading = lerpAngle(smoothedHeadingRef.current, newHeading, smoothingFactor);
        }
        
        smoothedHeadingRef.current = newHeading;
        lastHeadingUpdateRef.current = now;
      }
      
      setHeading(newHeading);
    }
  }, [isIOS]);

  const handleOrientationAbsolute = useCallback((event) => {
    // deviceorientationabsolute provides more accurate compass heading
    if (event.alpha !== null) {
      let newHeading = event.alpha;
      // Normalize to 0-360 range
      newHeading = newHeading % 360;
      if (newHeading < 0) newHeading += 360;
      
      // Apply smoothing for Android devices
      if (!isIOS) {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastHeadingUpdateRef.current;
        
        if (smoothedHeadingRef.current !== null && timeSinceLastUpdate < 100) {
          newHeading = lerpAngle(smoothedHeadingRef.current, newHeading, smoothingFactor);
        }
        
        smoothedHeadingRef.current = newHeading;
        lastHeadingUpdateRef.current = now;
      }
      
      setHeading(newHeading);
    }
  }, [isIOS]);

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
    } catch (err) {
      setError(err.message || String(err));
    }
  }, [handleOrientation]);

  // Exposed function to request permission from a user gesture
  const requestPermission = useCallback(async () => {
    if (!window.DeviceOrientationEvent) {
      setError('Device orientation not supported');
      return { granted: false, reason: 'unsupported' };
    }

    let eventType = 'deviceorientation';
    let orientationHandler = handleOrientation;
    if ('ondeviceorientationabsolute' in window) {
      eventType = 'deviceorientationabsolute';
      orientationHandler = handleOrientationAbsolute;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          addListeners(eventType, orientationHandler);
          setNeedsPermission(false);
          // Store permission in localStorage
          try {
            localStorage.setItem('compass_permission_granted', 'true');
          } catch (err) {
            console.warn('Failed to store compass permission:', err);
          }
          return { granted: true };
        }
        setError('Permission denied');
        return { granted: false, reason: 'denied' };
      } catch (err) {
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
    if (!window.DeviceOrientationEvent) {
      setError('Device orientation not supported');
      return;
    }

    // If the browser requires explicit permission via DeviceOrientationEvent.requestPermission,
    // check if permission was previously granted
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      if (compassPermissionGranted) {
        // Permission was previously granted, try to activate immediately
        let eventType = 'deviceorientation';
        let orientationHandler = handleOrientation;
        if ('ondeviceorientationabsolute' in window) {
          eventType = 'deviceorientationabsolute';
          orientationHandler = handleOrientationAbsolute;
        }
        addListeners(eventType, orientationHandler);
        setNeedsPermission(false);
      } else {
        // First time or permission not granted, show permission request
        setNeedsPermission(true);
      }
      return;
    }

    // Otherwise attach listeners immediately (non-iOS)
    let eventType = 'deviceorientation';
    let orientationHandler = handleOrientation;
    if ('ondeviceorientationabsolute' in window) {
      eventType = 'deviceorientationabsolute';
      orientationHandler = handleOrientationAbsolute;
    } else {
    }
    addListeners(eventType, orientationHandler);

    return () => {
      try {
        if (savedEventTypeRef.current && savedHandlerRef.current) {
          window.removeEventListener(savedEventTypeRef.current, savedHandlerRef.current);
        }
        window.removeEventListener('deviceorientation', handleOrientation);
      } catch (err) {
      }
      listenersAddedRef.current = false;
    };
  }, [addListeners, handleOrientation, handleOrientationAbsolute]);

  return { heading, error, needsPermission, requestPermission };
}
