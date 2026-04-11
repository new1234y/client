/** Rayon global à l’instant t (même logique paliers que le serveur). */
export function effectiveGlobalRadiusAtTime(summary, absT) {
  const R0 = Number(summary?.globalRadiusM) || 500;
  const s = summary?.settingsSnapshot || {};
  const hunt = summary?.huntStartedAt;
  if (s.zoneMode === "city" || !s.shrinkZoneEnabled || !hunt) return R0;
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
  if (elapsed <= 0) return R0;
  const segMs = durMs / phases;
  const idx = Math.min(phases - 1, Math.floor(elapsed / segMs));
  return radii[idx];
}

export function zoneModeFromSummary(summary) {
  return summary?.settingsSnapshot?.zoneMode === "city" ? "city" : "circle";
}

export function cityPolygonsFromSummary(summary) {
  return summary?.settingsSnapshot?.cityPolygons || [];
}
