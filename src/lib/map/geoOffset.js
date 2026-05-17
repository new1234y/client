const EARTH_R = 6371000;

/** Déplace (lat,lng) d'une distance fixe (m) selon un relèvement en degrés (0 = nord). */
export function offsetMeters(lat, lng, bearingDeg, distM) {
  const br = (bearingDeg * Math.PI) / 180;
  const dR = distM / EARTH_R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dR) +
      Math.cos(lat1) * Math.sin(dR) * Math.cos(br)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_R * c;
}
