/** Rayon global à l'instant t (même logique paliers que le serveur). */
export function effectiveGlobalRadiusAtTime(summary, absT) {
  console.log('[effectiveGlobalRadiusAtTime] Called with:', { summary, absT });
  const R0 = Number(summary?.globalRadiusM) || 500;
  const s = summary?.settingsSnapshot || {};
  const hunt = summary?.huntStartedAt;
  if (!s.shrinkZoneEnabled || !hunt) {
    console.log('[effectiveGlobalRadiusAtTime] Shrink zone disabled or no hunt start, returning R0:', R0);
    return R0;
  }
  const durMs = Math.max(
    60000,
    (Number(s.shrinkDurationMinutes) || 15) * 60 * 1000
  );
  const Rmin = Math.min(
    R0,
    Math.max(20, Number(s.shrinkMinRadiusM) || 80)
  );
  const phases = Math.max(
    2,
    Math.min(20, Math.floor(Number(s.shrinkPhases)) || 5)
  );
  const radii = [];
  for (let i = 0; i < phases; i++) {
    radii.push(R0 + (Rmin - R0) * (i / Math.max(1, phases - 1)));
  }
  const elapsed = absT - hunt;
  if (elapsed <= 0) {
    console.log('[effectiveGlobalRadiusAtTime] Elapsed time <= 0, returning R0:', R0);
    return R0;
  }
  const segMs = durMs / phases;
  const idx = Math.min(phases - 1, Math.floor(elapsed / segMs));
  const result = radii[idx];
  console.log('[effectiveGlobalRadiusAtTime] Result:', result);
  return result;
}
