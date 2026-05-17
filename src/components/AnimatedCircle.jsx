import { useEffect, useRef, useState } from "react";
import { Circle } from "react-leaflet";

/**
 * Cercle Leaflet dont le centre est interpolé quand les props changent (mouvement fluide).
 */
export default function AnimatedCircle({
  center,
  radius,
  pathOptions,
  children,
}) {
  const [display, setDisplay] = useState(() =>
    center ? [center.lat, center.lng] : [0, 0]
  );
  const prevRef = useRef(center ? [center.lat, center.lng] : null);
  const displayRef = useRef(display);
  const rafRef = useRef(null);
  displayRef.current = display;

  useEffect(() => {
    if (!center || radius == null) return;
    const to = [center.lat, center.lng];
    const from = prevRef.current;
    if (
      !from ||
      (Math.abs(from[0] - to[0]) < 1e-9 && Math.abs(from[1] - to[1]) < 1e-9)
    ) {
      prevRef.current = to;
      setDisplay(to);
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startFrom = [...displayRef.current];
    const startT = performance.now();
    const dur = 480;
    const tick = (now) => {
      const u = Math.min(1, (now - startT) / dur);
      const e = 1 - (1 - u) * (1 - u);
      setDisplay([
        startFrom[0] + (to[0] - startFrom[0]) * e,
        startFrom[1] + (to[1] - startFrom[1]) * e,
      ]);
      if (u < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [center?.lat, center?.lng, radius]);

  if (!center || radius == null) return null;

  return (
    <Circle center={display} radius={radius} pathOptions={pathOptions}>
      {children}
    </Circle>
  );
}
