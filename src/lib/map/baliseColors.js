/** Idle purple, capturing blue, fully captured green (until expiry). */
export const BALISE_IDLE = "#a855f7";
export const BALISE_CAPTURING = "#3b82f6";
export const BALISE_CAPTURED = "#22c55e";

export function baliseTintColor(b) {
  if (b?.capturedBy) return BALISE_CAPTURED;
  if (b?.beingCapturedBy) return BALISE_CAPTURING;
  return BALISE_IDLE;
}

export function baliseFillColor(b) {
  if (b?.capturedBy) return "#86efac";
  if (b?.beingCapturedBy) return "#93c5fd";
  return "#d8b4fe";
}
