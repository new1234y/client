import { useState, useEffect, useCallback } from "react";

export function useDeviceOrientation() {
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);

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
    if (event.webkitCompassHeading) {
      // iOS Safari specific
      newHeading = event.webkitCompassHeading;
      console.log('[useDeviceOrientation] Using webkitCompassHeading:', newHeading);
    } else if (event.alpha !== null) {
      // Standard DeviceOrientationEvent
      // alpha is the compass heading relative to north (0-360)
      // Note: on some devices alpha might be relative to initial device orientation
      newHeading = 360 - event.alpha;
      console.log('[useDeviceOrientation] Using alpha (360 - alpha):', newHeading);
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

  useEffect(() => {
    console.log('[useDeviceOrientation] useEffect - initializing');
    // Check if device orientation is supported
    if (!window.DeviceOrientationEvent) {
      console.log('[useDeviceOrientation] DeviceOrientationEvent not supported');
      setError("Device orientation not supported");
      return;
    }

    let orientationHandler = handleOrientation;
    let eventType = 'deviceorientation';

    // Try to use deviceorientationabsolute first (more accurate)
    if ('ondeviceorientationabsolute' in window) {
      eventType = 'deviceorientationabsolute';
      orientationHandler = handleOrientationAbsolute;
      console.log('[useDeviceOrientation] Using deviceorientationabsolute');
    } else {
      console.log('[useDeviceOrientation] deviceorientationabsolute not available, using deviceorientation');
    }

    // iOS 13+ requires permission request
    const requestPermission = async () => {
      console.log('[useDeviceOrientation] Requesting permission');
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          console.log('[useDeviceOrientation] iOS 13+ detected, requesting permission');
          const permission = await DeviceOrientationEvent.requestPermission();
          console.log('[useDeviceOrientation] Permission result:', permission);
          if (permission === 'granted') {
            console.log('[useDeviceOrientation] Permission granted, adding event listeners');
            window.addEventListener(eventType, orientationHandler);
            // Also try standard event as fallback
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            console.log('[useDeviceOrientation] Permission denied');
            setError('Permission denied');
          }
        } catch (err) {
          console.log('[useDeviceOrientation] Permission request error:', err);
          setError(err.message);
        }
      } else {
        // Non-iOS devices or older iOS
        console.log('[useDeviceOrientation] Non-iOS or older iOS, adding event listeners directly');
        window.addEventListener(eventType, orientationHandler);
        // Also add standard event as fallback
        if (eventType !== 'deviceorientation') {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      }
    };

    // Try to request permission on iOS
    requestPermission();

    return () => {
      console.log('[useDeviceOrientation] Cleanup - removing event listeners');
      window.removeEventListener(eventType, orientationHandler);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [handleOrientation, handleOrientationAbsolute]);

  return { heading, error };
}
