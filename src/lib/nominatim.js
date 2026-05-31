/**
 * Client Nominatim (respecter https://operations.osmfoundation.org/policies/nominatim/ — usage modéré).
 * Retourne des anneaux [[lat, lng], ...] pour union côté serveur.
 */

function ringFromGeoJsonCoords(coords) {
  console.log('[ringFromGeoJsonCoords] Called with:', { coordsLength: coords?.length });
  if (!coords?.length) {
    console.log('[ringFromGeoJsonCoords] No coords, returning null');
    return null;
  }
  const ring = coords.map(([lng, lat]) => [Number(lat), Number(lng)]);
  const result = ring.length >= 3 ? ring : null;
  console.log('[ringFromGeoJsonCoords] Result:', result);
  return result;
}

function ringsFromGeoJson(geom) {
  console.log('[ringsFromGeoJson] Called with:', { geomType: geom?.type });
  if (!geom) {
    console.log('[ringsFromGeoJson] No geometry, returning []');
    return [];
  }
  if (geom.type === "Polygon") {
    const outer = ringFromGeoJsonCoords(geom.coordinates?.[0]);
    const result = outer ? [outer] : [];
    console.log('[ringsFromGeoJson] Polygon result:', result);
    return result;
  }
  if (geom.type === "MultiPolygon") {
    const out = [];
    for (const poly of geom.coordinates || []) {
      const outer = ringFromGeoJsonCoords(poly?.[0]);
      if (outer) out.push(outer);
    }
    console.log('[ringsFromGeoJson] MultiPolygon result:', out);
    return out;
  }
  console.log('[ringsFromGeoJson] Unknown geometry type, returning []');
  return [];
}

export async function nominatimSearchCitiesNear(lat, lng, limit = 5) {
  console.log('[nominatimSearchCitiesNear] Called with:', { lat, lng, limit });
  const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    addressdetails: "1",
    zoom: "10",
  })}`;
  const headers = {
    Accept: "application/json",
    "Accept-Language": "fr",
  };
  console.log('[nominatimSearchCitiesNear] Fetching reverse geocode...');
  const rev = await fetch(url, { headers });
  if (!rev.ok) throw new Error("Nominatim reverse indisponible");
  const revData = await rev.json();
  console.log('[nominatimSearchCitiesNear] Reverse geocode data:', revData);
  const city =
    revData?.address?.city ||
    revData?.address?.town ||
    revData?.address?.village ||
    revData?.address?.municipality ||
    "";
  const searchQ = city || revData?.display_name?.split(",")?.[0]?.trim() || "city";
  console.log('[nominatimSearchCitiesNear] Search query:', searchQ);
  const searchUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: "json",
    q: searchQ,
    limit: String(limit),
    polygon_geojson: "1",
    addressdetails: "0",
  })}`;
  console.log('[nominatimSearchCitiesNear] Fetching search...');
  const res = await fetch(searchUrl, { headers });
  if (!res.ok) throw new Error("Nominatim search indisponible");
  const list = await res.json();
  const result = (Array.isArray(list) ? list : []).map((item) => ({
    id: String(item.osm_id ?? item.place_id),
    name: item.display_name?.split(",")?.slice(0, 2)?.join(", ") || item.display_name,
    rings: ringsFromGeoJson(item.geojson),
    raw: item,
  }));
  console.log('[nominatimSearchCitiesNear] Result:', result);
  return result;
}

export async function nominatimSearchCityByName(query, limit = 8) {
  console.log('[nominatimSearchCityByName] Called with:', { query, limit });
  const searchUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: "json",
    q: query,
    limit: String(limit),
    polygon_geojson: "1",
    addressdetails: "0",
  })}`;
  const headers = {
    Accept: "application/json",
    "Accept-Language": "fr",
  };
  console.log('[nominatimSearchCityByName] Fetching search...');
  const res = await fetch(searchUrl, { headers });
  if (!res.ok) throw new Error("Recherche ville indisponible");
  const list = await res.json();
  const result = (Array.isArray(list) ? list : []).map((item) => ({
    id: String(item.osm_id ?? item.place_id),
    name: item.display_name?.split(",")?.slice(0, 3)?.join(", ") || item.display_name,
    rings: ringsFromGeoJson(item.geojson),
    raw: item,
  }));
  console.log('[nominatimSearchCityByName] Result:', result);
  return result;
}
