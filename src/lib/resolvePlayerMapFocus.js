/**
 * Résout où centrer la carte pour un joueur donné.
 * Retourne { type: 'exact'|'circle'|'hidden'|'unavailable', lat?, lng?, zoom?, radiusM? }
 */
export function resolvePlayerMapFocus(targetSessionId, { gameState, position, mySessionId }) {
  if (!targetSessionId || !gameState) return { type: "unavailable" };

  const rosterPlayer = (gameState.roster || []).find((p) => p.sessionId === targetSessionId);
  if (rosterPlayer?.invisible) return { type: "hidden" };

  if (targetSessionId === mySessionId) {
    const lat = position?.lat ?? gameState.me?.lat;
    const lng = position?.lng ?? gameState.me?.lng;
    if (lat != null && lng != null) {
      return { type: "exact", lat, lng, zoom: 18 };
    }
  }

  const sources = [
    ...(gameState.allies || []),
    ...(gameState.catsExact || []),
    ...(gameState.spectators || []),
    ...(gameState.preyForCat || []),
    ...(gameState.adminPreyPreview || []),
  ];

  for (const s of sources) {
    if (s.sessionId !== targetSessionId) continue;
    if (s.kind === "circle" && s.center) {
      return {
        type: "circle",
        lat: s.center.lat,
        lng: s.center.lng,
        radiusM: s.radiusM,
        zoom: 16,
      };
    }
    if (s.lat != null && s.lng != null) {
      return { type: "exact", lat: s.lat, lng: s.lng, zoom: 18 };
    }
  }

  return { type: "unavailable" };
}
