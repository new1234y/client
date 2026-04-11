/**
 * Client Nominatim (respecter https://operations.osmfoundation.org/policies/nominatim/ — usage modéré).
 * Retourne des anneaux [[lat, lng], ...] pour union côté serveur.
 */

function ringFromGeoJsonCoords(coords) {
  if (!coords?.length) return null;
  const ring = coords.map(([lng, lat]) => [Number(lat), Number(lng)]);
  return ring.length >= 3 ? ring : null;
}

function ringsFromGeoJson(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") {
    const outer = ringFromGeoJsonCoords(geom.coordinates?.[0]);
    return outer ? [outer] : [];
  }
  if (geom.type === "MultiPolygon") {
    const out = [];
    for (const poly of geom.coordinates || []) {
      const outer = ringFromGeoJsonCoords(poly?.[0]);
      if (outer) out.push(outer);
    }
    return out;
  }
  return [];
}

export async function nominatimSearchCitiesNear(lat, lng, limit = 5) {
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
  const rev = await fetch(url, { headers });
  if (!rev.ok) throw new Error("Nominatim reverse indisponible");
  const revData = await rev.json();
  const city =
    revData?.address?.city ||
    revData?.address?.town ||
    revData?.address?.village ||
    revData?.address?.municipality ||
    "";
  const searchQ = city || revData?.display_name?.split(",")?.[0]?.trim() || "city";
  const searchUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: "json",
    q: searchQ,
    limit: String(limit),
    polygon_geojson: "1",
    addressdetails: "0",
  })}`;
  const res = await fetch(searchUrl, { headers });
  if (!res.ok) throw new Error("Nominatim search indisponible");
  const list = await res.json();
  return (Array.isArray(list) ? list : []).map((item) => ({
    id: String(item.osm_id ?? item.place_id),
    name: item.display_name?.split(",")?.slice(0, 2)?.join(", ") || item.display_name,
    rings: ringsFromGeoJson(item.geojson),
    raw: item,
  }));
}

export async function nominatimSearchCityByName(query, limit = 8) {
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
  const res = await fetch(searchUrl, { headers });
  if (!res.ok) throw new Error("Recherche ville indisponible");
  const list = await res.json();
  return (Array.isArray(list) ? list : []).map((item) => ({
    id: String(item.osm_id ?? item.place_id),
    name: item.display_name?.split(",")?.slice(0, 3)?.join(", ") || item.display_name,
    rings: ringsFromGeoJson(item.geojson),
    raw: item,
  }));
}
