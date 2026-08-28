import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "../../lib/map/mapboxKey.js";
import {
  getMap3dMode,
  getMapGyro,
  setMapGyro,
  MAP_PREF_EVENTS,
  resolveMapboxStyleUrl,
} from "../../lib/map/mapPrefs.js";
import { offsetMeters } from "../../lib/map/geoOffset.js";
import { getServerTime } from "../../lib/serverTime.js";
import { useDeviceOrientation } from "../../hooks/useDeviceOrientation.js";
import BaliseSheet from "./BaliseSheet.jsx";
import { ensureSciFiTowerLayer, syncSciFiTowers } from "../../lib/map/SciFiTowerLayer.js";

function circlePolygon(lat, lng, radiusM, points = 64) {
  const coords = [];
  for (let i = 0; i <= points; i++) {
    const p = offsetMeters(lat, lng, (i * 360) / points, radiusM);
    coords.push([p.lng, p.lat]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

function feature(geometry, properties = {}) {
  return { type: "Feature", properties, geometry };
}

function emptyFc() {
  return { type: "FeatureCollection", features: [] };
}

function shortestArcDelta(fromDeg, toDeg) {
  const from = ((Number(fromDeg) % 360) + 360) % 360;
  const to = ((Number(toDeg) % 360) + 360) % 360;
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function toSignedBearing(deg) {
  let x = ((Number(deg) % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

function publishMapBearing(deg) {
  try {
    window.dispatchEvent(new CustomEvent(MAP_PREF_EVENTS.bearing, { detail: deg }));
  } catch {
    // ignore
  }
}

const GYRO_DEAD_ZONE_DEG = 12;
const GYRO_EASE_MS = 1000;
const NORTH_EASE_MS = 900;

function pinEl({ bg, border = "#fff", size = 34, html, label, extraShadow = "" }) {
  const el = document.createElement("div");
  el.className = "chase-mbx-pin";
  el.style.cssText = `width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;`;
  if (html) {
    el.innerHTML = html;
  } else {
    el.innerHTML = `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:${bg};border:3px solid ${border};box-shadow:0 2px 8px rgba(0,0,0,.45)${extraShadow};font-size:11px;font-weight:800;color:#fff">${label || ""}</span>`;
  }
  return el;
}

function selfHtml(oob) {
  const border = oob ? "4px solid #ef4444" : "3px solid #fff";
  const glow = oob ? ",0 0 10px rgba(239,68,68,.8)" : "";
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#2563eb;border:${border};box-shadow:0 2px 8px rgba(0,0,0,.45)${glow};font-size:12px;font-weight:800;color:#fff">Moi</span>`;
}

function ghostHtml() {
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:rgba(15,23,42,0.72);border:3px solid rgba(148,163,184,0.9);box-shadow:0 0 10px rgba(148,163,184,0.7);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 20v-8a5 5 0 0110 0v8l-2-1.5L13 20l-2-1.5L9 20l-2-1.5z" fill="#e5e7eb"/><circle cx="10" cy="11" r="1" fill="#020617"/><circle cx="14" cy="11" r="1" fill="#020617"/></svg></span>`;
}

function discHtml() {
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#64748b;border:3px dashed #e2e8f0;opacity:.88"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2"><line x1="4" y1="4" x2="20" y2="20"/></svg></span>`;
}

function allyHtml(oob) {
  const border = oob ? "4px solid #ef4444" : "3px solid #fff";
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#d97706;border:${border};box-shadow:0 2px 8px rgba(0,0,0,.45)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#fef3c7"/><circle cx="10" cy="10" r="1.2" fill="#1a1a1a"/><circle cx="14" cy="10" r="1.2" fill="#1a1a1a"/></svg></span>`;
}

function catHtml(oob) {
  const border = oob ? "4px solid #ef4444" : "3px solid #fff";
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#7f1d1d;border:${border};box-shadow:0 2px 8px rgba(0,0,0,.45)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#fca5a5"/><circle cx="9" cy="10" r="1.5" fill="#1a1a1a"/><circle cx="15" cy="10" r="1.5" fill="#1a1a1a"/></svg></span>`;
}

function preyHtml(oob) {
  const border = oob ? "4px solid #ef4444" : "3px solid #fff";
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#ea580c;border:${border};box-shadow:0 2px 8px rgba(0,0,0,.45)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2.5" fill="#fff"/><path d="M8 22l4-8 4 8M6 12l6-3 6 3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></span>`;
}

function chatLocHtml() {
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:14px;background:#0ea5e9;border:2px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.35)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#fff"/><circle cx="12" cy="9" r="2.5" fill="#0ea5e9"/></svg></span>`;
}

function baliseHtml(color, mode3d) {
  const pulse = mode3d !== "2d"
    ? `<span class="chase-balise-pulse" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:.55"></span>`
    : "";
  return `<div style="position:relative;width:28px;height:36px;display:flex;align-items:flex-end;justify-content:center">${pulse}<svg width="22" height="32" viewBox="0 0 24 36" aria-hidden="true"><rect x="9" y="10" width="6" height="18" rx="1.2" fill="${color}"/><polygon points="12,2 17,10 7,10" fill="${color}"/><circle cx="12" cy="12" r="2.2" fill="#fff"/><rect x="6" y="28" width="12" height="4" rx="1" fill="${color}"/></svg></div>`;
}

function ensureSources(map) {
  const specs = [
    ["src-zone", emptyFc()],
    ["src-zone-next", emptyFc()],
    ["src-jam", emptyFc()],
    ["src-prey", emptyFc()],
    ["src-balise", emptyFc()],
    ["src-highlight", emptyFc()],
    ["src-route", emptyFc()],
    ["src-lure", emptyFc()],
  ];
  for (const [id, data] of specs) {
    if (!map.getSource(id)) {
      map.addSource(id, { type: "geojson", data });
    }
  }
  const addFill = (id, source, color, opacity) => {
    if (map.getLayer(id)) return;
    map.addLayer({
      id,
      type: "fill",
      source,
      paint: { "fill-color": color, "fill-opacity": opacity },
    });
  };
  const addLine = (id, source, color, width, dash) => {
    if (map.getLayer(id)) return;
    const paint = { "line-color": color, "line-width": width };
    if (dash) paint["line-dasharray"] = dash;
    map.addLayer({ id, type: "line", source, paint });
  };
  addFill("zone-fill", "src-zone", "#818cf8", 0.08);
  addLine("zone-line", "src-zone", "#6366f1", 3);
  addLine("zone-next", "src-zone-next", "#facc15", 3, [2, 2]);
  addFill("jam-fill", "src-jam", ["get", "fill"], 0.16);
  addLine("jam-line", "src-jam", ["get", "color"], 3);
  addFill("prey-fill", "src-prey", ["get", "fill"], 0.22);
  addLine("prey-line", "src-prey", ["get", "color"], 3);
  addFill("balise-fill", "src-balise", ["get", "fill"], 0.22);
  addLine("balise-line", "src-balise", ["get", "color"], 3);
  try {
    if (map.getLayer("balise-tower")) map.removeLayer("balise-tower");
    if (map.getSource("src-balise-tower")) map.removeSource("src-balise-tower");
  } catch {
    // leftover cube extrusion from older builds
  }
  ensureSciFiTowerLayer(map);
  addFill("highlight-fill", "src-highlight", "#fbbf24", 0.25);
  addLine("route-line", "src-route", "#10b981", 2, [2, 2]);
  addFill("lure-fill", "src-lure", "#c4b5fd", 0.45);
}

function applyTerrain(map, enable, lock = false) {
  try {
    if (enable) {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.15 });
      map.easeTo({ pitch: 60, duration: 700, essential: true, ...(lock ? { bearing: map.getBearing() } : {}) });
      if (!map.getLayer("3d-buildings") && map.getSource("composite")) {
        const layers = map.getStyle()?.layers || [];
        const labelLayerId = layers.find(
          (l) => l.type === "symbol" && l.layout && l.layout["text-field"]
        )?.id;
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#94a3b8",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.65,
            },
          },
          labelLayerId
        );
      }
    } else {
      if (map.getLayer("3d-buildings")) map.removeLayer("3d-buildings");
      try {
        map.setTerrain(null);
      } catch {
        // ignore
      }
      map.easeTo({ pitch: 0, duration: 700, essential: true });
    }
  } catch {
    // style may not support extrusion
  }
}

export default function MapboxMap({
  gameState,
  role,
  mySessionId,
  basemapId = "light",
  recenterTick = 0,
  zoomInTick = 0,
  zoomOutTick = 0,
  geoChatItems = [],
  focusCenter = null,
  focusTick = 0,
  focusZoom = 18,
  highlightSessionId = null,
  onPlayerClick = null,
  baliseLureSelecting = false,
  baliseLureTarget = null,
  onBaliseLureSelect = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const readyRef = useRef(false);
  const styleUrlRef = useRef("");
  const propsRef = useRef({});
  const bearingRef = useRef(0);
  const [mapError, setMapError] = useState(null);
  const [selectedBalise, setSelectedBalise] = useState(null);
  const [mode3d, setMode3d] = useState(() => getMap3dMode());
  const [gyroOn, setGyroOn] = useState(() => getMapGyro());
  const [mapReady, setMapReady] = useState(false);
  const easingRef = useRef(false);
  const easeGenRef = useRef(0);
  const easeTimerRef = useRef(0);
  const gyroOnRef = useRef(gyroOn);
  const headingRef = useRef(null);

  const enable3d = mode3d !== "2d";
  const lock3d = mode3d === "3d_lock";
  const { heading, requestPermission } = useDeviceOrientation();
  gyroOnRef.current = gyroOn;
  headingRef.current = heading;

  const me = gameState?.me;
  const defaultCenter = [2.5, 46.8];
  const initialCenter = useMemo(() => {
    if (me?.lat != null && me?.lng != null) return [me.lng, me.lat];
    if (gameState?.gameCenter) return [gameState.gameCenter.lng, gameState.gameCenter.lat];
    return defaultCenter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const initialZoom = me?.lat != null ? 17 : gameState?.effectiveGlobalCenter ? 14 : 6;

  useEffect(() => {
    const sync = () => {
      setMode3d(getMap3dMode());
      const nextGyro = getMapGyro();
      gyroOnRef.current = nextGyro;
      setGyroOn(nextGyro);
    };
    window.addEventListener(MAP_PREF_EVENTS.d3, sync);
    window.addEventListener(MAP_PREF_EVENTS.gyro, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MAP_PREF_EVENTS.d3, sync);
      window.removeEventListener(MAP_PREF_EVENTS.gyro, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);


  useEffect(() => {
    const token = getMapboxToken();
    if (!token || !containerRef.current) return undefined;
    mapboxgl.accessToken = token;
    const styleUrl = resolveMapboxStyleUrl(basemapId);
    styleUrlRef.current = styleUrl;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
      pitch: enable3d ? 60 : 0,
      antialias: true,
      maxZoom: 22,
      minZoom: 2,
      dragRotate: enable3d && !lock3d,
      pitchWithRotate: enable3d && !lock3d,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    const onLoad = () => {
      readyRef.current = true;
      ensureSources(map);
      applyTerrain(map, enable3d, lock3d);
      ensureSciFiTowerLayer(map);
      setMapReady(true);
      map.resize();
    };
    map.on("load", onLoad);
    map.on("error", () => {
      setMapError("Impossible de charger la carte Mapbox. Vérifiez le jeton.");
    });

    const onClick = (e) => {
      const p = propsRef.current;
      if (p.role === "cat" && p.baliseLureSelecting && p.onBaliseLureSelect) {
        p.onBaliseLureSelect(e.lngLat.lat, e.lngLat.lng);
        return;
      }
    };
    map.on("click", onClick);
    const onRotate = () => {
      try {
        bearingRef.current = map.getBearing();
      } catch {
        // ignore
      }
    };
    const onRotateEnd = () => {
      try {
        const b = map.getBearing();
        bearingRef.current = b;
        publishMapBearing(toSignedBearing(b));
      } catch {
        // ignore
      }
    };
    map.on("rotate", onRotate);
    map.on("rotateend", onRotateEnd);

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          try {
            map.resize();
          } catch {
            // ignore
          }
        })
      : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);

    return () => {
      readyRef.current = false;
      setMapReady(false);
      if (ro) ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // recreate only when token/container first mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const nextUrl = resolveMapboxStyleUrl(basemapId);
    if (styleUrlRef.current === nextUrl) return;
    styleUrlRef.current = nextUrl;
    readyRef.current = false;
    setMapReady(false);
    map.setStyle(nextUrl);
    map.once("style.load", () => {
      ensureSources(map);
      applyTerrain(map, getMap3dMode() !== "2d", getMap3dMode() === "3d_lock");
      ensureSciFiTowerLayer(map);
      readyRef.current = true;
      setMapReady(true);
    });
  }, [basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    applyTerrain(map, enable3d, lock3d);
    ensureSciFiTowerLayer(map);
    if (enable3d && !lock3d) {
      map.dragRotate.enable();
      map.touchPitch?.enable?.();
    } else {
      map.dragRotate.disable();
      map.touchPitch?.disable?.();
    }
  }, [enable3d, lock3d, mapReady]);

  const easeMapBearing = useCallback((bearing, duration, { force = false } = {}) => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (easingRef.current && !force) return;
    const gen = ++easeGenRef.current;
    easingRef.current = true;
    if (easeTimerRef.current) {
      window.clearTimeout(easeTimerRef.current);
      easeTimerRef.current = 0;
    }
    if (force) {
      try {
        map.stop();
      } catch {
        // ignore
      }
    }
    const finish = () => {
      if (gen !== easeGenRef.current) return;
      if (!easingRef.current) return;
      easingRef.current = false;
      try {
        const b = map.getBearing();
        bearingRef.current = b;
        publishMapBearing(toSignedBearing(b));
      } catch {
        // ignore
      }
      const h = headingRef.current;
      if (gyroOnRef.current && h != null) {
        let current = bearingRef.current;
        try {
          current = map.getBearing();
        } catch {
          // keep ref
        }
        if (Math.abs(shortestArcDelta(current, h)) >= GYRO_DEAD_ZONE_DEG) {
          easeMapBearing(h, GYRO_EASE_MS);
        }
      }
    };
    const onEnd = () => finish();
    map.once("moveend", onEnd);
    bearingRef.current = bearing;
    publishMapBearing(toSignedBearing(bearing));
    map.easeTo({
      bearing,
      duration,
      essential: true,
    });
    easeTimerRef.current = window.setTimeout(() => {
      if (gen !== easeGenRef.current) return;
      try {
        map.off("moveend", onEnd);
      } catch {
        // ignore
      }
      finish();
    }, duration + 120);
  }, []);

  useEffect(() => {
    if (!gyroOn || heading == null) return;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (easingRef.current) return;
    let current = bearingRef.current;
    try {
      current = map.getBearing();
    } catch {
      // keep ref
    }
    const delta = shortestArcDelta(current, heading);
    if (Math.abs(delta) < GYRO_DEAD_ZONE_DEG) return;
    easeMapBearing(heading, GYRO_EASE_MS);
  }, [heading, gyroOn, mapReady, easeMapBearing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !recenterTick) return;
    if (me?.lat != null && me?.lng != null) {
      map.easeTo({ center: [me.lng, me.lat], zoom: 17, duration: 600, essential: true, bearing: map.getBearing() });
    }
  }, [recenterTick, me?.lat, me?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomInTick) return;
    map.zoomIn();
  }, [zoomInTick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomOutTick) return;
    map.zoomOut();
  }, [zoomOutTick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTick || !focusCenter) return;
    const lat = Array.isArray(focusCenter) ? focusCenter[0] : focusCenter.lat;
    const lng = Array.isArray(focusCenter) ? focusCenter[1] : focusCenter.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo({
      center: [lng, lat],
      zoom: Math.min(24, focusZoom || 17),
      duration: 800,
      essential: true,
    });
  }, [focusTick, focusCenter, focusZoom]);

  const handleShowBaliseOnMap = useCallback((center) => {
    const map = mapRef.current;
    if (!map || center?.lat == null || center?.lng == null) return;
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: 17,
      duration: 800,
      essential: true,
    });
  }, []);

  const chatGeoMarkers = useMemo(() => {
    const photos = [];
    const locations = [];
    for (const m of geoChatItems || []) {
      const la = Number(m.lat);
      const lo = Number(m.lng);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
      if (m.type === "image" && m.image) {
        photos.push({ id: m.id, lat: la, lng: lo, image: m.image, nickname: m.nickname || "" });
      } else if (m.type === "location") {
        locations.push({ id: m.id, lat: la, lng: lo, nickname: m.nickname || "", text: m.text || "" });
      }
    }
    return { photos, locations };
  }, [geoChatItems]);

  propsRef.current = {
    gameState,
    role,
    mySessionId,
    onPlayerClick,
    baliseLureSelecting,
    onBaliseLureSelect,
    highlightSessionId,
    chatGeoMarkers,
    baliseLureTarget,
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !gameState) return;

    const now = getServerTime();
    const gc = gameState.effectiveGlobalCenter || gameState.gameCenter;
    const nextGc = gameState.nextPhaseCenter;
    const nextGr = gameState.nextPhaseRadiusM;
    const gr = gameState.effectiveGlobalRadiusM ?? gameState.settings?.globalRadiusM;
    const skipZone = me?.outOfBoundsOverrideUntil && me.outOfBoundsOverrideUntil > now;

    const setData = (id, fc) => {
      const src = map.getSource(id);
      if (src) src.setData(fc);
    };

    if (gc && gr != null && !skipZone) {
      setData("src-zone", {
        type: "FeatureCollection",
        features: [feature(circlePolygon(gc.lat, gc.lng, gr))],
      });
    } else {
      setData("src-zone", emptyFc());
    }
    if (nextGc && nextGr != null && !skipZone) {
      setData("src-zone-next", {
        type: "FeatureCollection",
        features: [feature(circlePolygon(nextGc.lat, nextGc.lng, nextGr))],
      });
    } else {
      setData("src-zone-next", emptyFc());
    }

    const jamFeats = [];
    const myJam = gameState.myJamCircle;
    if (myJam?.center && myJam?.radiusM != null) {
      jamFeats.push(
        feature(circlePolygon(myJam.center.lat, myJam.center.lng, myJam.radiusM), {
          color: "#0284c7",
          fill: "#0ea5e9",
        })
      );
    }
    const myFake = me?.fakePosition;
    const hasFake = myFake && myFake.until > now && myFake.lat != null;
    if (hasFake && role === "player" && myJam?.radiusM != null) {
      const c = myFake.jamCircleCenter || { lat: myFake.lat, lng: myFake.lng };
      jamFeats.push(
        feature(circlePolygon(c.lat, c.lng, myJam.radiusM), {
          color: "#8b5cf6",
          fill: "#a78bfa",
        })
      );
    }
    for (const ally of gameState.allies || []) {
      if (ally.sessionId === mySessionId) continue;
      if (!ally.jamCircleCenter || !ally.jamCircleRadiusM) continue;
      jamFeats.push(
        feature(circlePolygon(ally.jamCircleCenter.lat, ally.jamCircleCenter.lng, ally.jamCircleRadiusM), {
          color: "#d97706",
          fill: "#fbbf24",
        })
      );
    }
    setData("src-jam", { type: "FeatureCollection", features: jamFeats });

    const preyFeats = [];
    const collectPrey = (list) => {
      for (const p of list || []) {
        if (p.kind === "circle" && p.center && p.radiusM != null) {
          const isOut = !!p.outOfBounds;
          preyFeats.push(
            feature(circlePolygon(p.center.lat, p.center.lng, p.radiusM), {
              color: p.disconnected ? "#94a3b8" : isOut ? "#ef4444" : "#fb923c",
              fill: p.disconnected ? "#cbd5e1" : "#f97316",
              fillOp: p.disconnected ? 0.12 : 0.26,
            })
          );
        }
      }
    };
    if (role === "cat") collectPrey(gameState.preyForCat);
    collectPrey(gameState.adminPreyPreview);
    setData("src-prey", { type: "FeatureCollection", features: preyFeats });

    const baliseFeats = [];
    const towers = [];
    for (const b of gameState.balises || []) {
      const capturing = b.beingCapturedBy != null;
      const mine = b.beingCapturedBy === mySessionId;
      const color = capturing ? (mine ? "#22c55e" : "#f97316") : "#a855f7";
      const fill = capturing ? (mine ? "#86efac" : "#fdba74") : "#d8b4fe";
      baliseFeats.push(
        feature(circlePolygon(b.lat, b.lng, b.radiusM), { color, fill, id: b.id })
      );
      if (enable3d) {
        towers.push({ id: b.id, lat: b.lat, lng: b.lng, color });
      }
    }
    setData("src-balise", { type: "FeatureCollection", features: baliseFeats });
    syncSciFiTowers(map, towers, enable3d);

    if (baliseLureTarget && role === "cat") {
      setData("src-lure", {
        type: "FeatureCollection",
        features: [
          feature(circlePolygon(baliseLureTarget.lat, baliseLureTarget.lng, 18), {}),
        ],
      });
    } else {
      setData("src-lure", emptyFc());
    }

    const routeFeats = [];
    if (
      Number.isFinite(me?.lat) &&
      Number.isFinite(me?.lng) &&
      Number.isFinite(nextGc?.lat) &&
      Number.isFinite(nextGc?.lng) &&
      Number.isFinite(nextGr)
    ) {
      const R = 6371000;
      const dLat = ((nextGc.lat - me.lat) * Math.PI) / 180;
      const dLon = ((nextGc.lng - me.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((me.lat * Math.PI) / 180) *
          Math.cos((nextGc.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist > nextGr) {
        routeFeats.push(
          feature({
            type: "LineString",
            coordinates: [
              [me.lng, me.lat],
              [nextGc.lng, nextGc.lat],
            ],
          })
        );
      }
    }
    setData("src-route", { type: "FeatureCollection", features: routeFeats });

    const pins = [];
    const selfInvisible = me?.invisUntil && me.invisUntil > now;
    if (me?.lat != null && me?.lng != null) {
      pins.push({
        key: `me-${mySessionId}`,
        lng: me.lng,
        lat: me.lat,
        size: 34,
        html: selfInvisible ? ghostHtml() : selfHtml(!!me.outOfBounds),
        data: { ...me, sessionId: mySessionId },
      });
    }
    for (const a of gameState.allies || []) {
      if (a.sessionId === mySessionId || a.lat == null) continue;
      pins.push({
        key: `ally-${a.sessionId}`,
        lng: a.lng,
        lat: a.lat,
        size: 38,
        html: a.disconnected ? discHtml() : a.invisible ? ghostHtml() : allyHtml(!!a.outOfBounds),
        data: a,
      });
    }
    for (const c of gameState.catsExact || []) {
      if (c.sessionId === mySessionId || c.lat == null) continue;
      pins.push({
        key: `cat-${c.sessionId}`,
        lng: c.lng,
        lat: c.lat,
        size: 40,
        html: c.disconnected ? discHtml() : c.invisible ? ghostHtml() : catHtml(!!c.outOfBounds),
        data: c,
      });
    }
    if (role === "cat") {
      for (const p of gameState.preyForCat || []) {
        if (p.kind !== "exact" || p.lat == null) continue;
        pins.push({
          key: `prey-${p.sessionId}`,
          lng: p.lng,
          lat: p.lat,
          size: 36,
          html: p.disconnected ? discHtml() : preyHtml(!!p.outOfBounds),
          data: { ...p, role: "player" },
        });
      }
    }
    for (const p of gameState.adminPreyPreview || []) {
      if (p.kind !== "exact" || p.lat == null) continue;
      pins.push({
        key: `adm-${p.sessionId}`,
        lng: p.lng,
        lat: p.lat,
        size: 36,
        html: p.disconnected ? discHtml() : preyHtml(!!p.outOfBounds),
        data: { ...p, role: "player" },
      });
    }
    if (hasFake) {
      pins.push({
        key: "fake-pos",
        lng: myFake.lng,
        lat: myFake.lat,
        size: 36,
        html: `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#8b5cf6;border:3px solid #fff;font-size:12px;font-weight:800;color:#fff">Faux</span>`,
        data: null,
      });
    }
    for (const b of gameState.balises || []) {
      const capturing = b.beingCapturedBy != null;
      const mine = b.beingCapturedBy === mySessionId;
      const color = capturing ? (mine ? "#22c55e" : "#f97316") : "#a855f7";
      pins.push({
        key: `balise-${b.id}`,
        lng: b.lng,
        lat: b.lat,
        size: 28,
        html: baliseHtml(color, mode3d),
        balise: b,
      });
    }
    for (const m of chatGeoMarkers.locations) {
      pins.push({
        key: `chatloc-${m.id}`,
        lng: m.lng,
        lat: m.lat,
        size: 38,
        html: chatLocHtml(),
        data: null,
      });
    }
    for (const m of chatGeoMarkers.photos) {
      const safe = String(m.image || "").replace(/'/g, "");
      pins.push({
        key: `chatimg-${m.id}`,
        lng: m.lng,
        lat: m.lat,
        size: 40,
        html: `<div style="width:40px;height:40px;border-radius:12px;overflow:hidden;border:2px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4)"><img src='${safe}' alt='' style="width:100%;height:100%;object-fit:cover"/></div>`,
        data: null,
      });
    }

    let highlight = null;
    if (highlightSessionId) {
      const hit = pins.find((p) => p.data?.sessionId === highlightSessionId);
      if (hit) highlight = hit;
    }
    if (highlight) {
      setData("src-highlight", {
        type: "FeatureCollection",
        features: [feature(circlePolygon(highlight.lat, highlight.lng, 18))],
      });
    } else {
      setData("src-highlight", emptyFc());
    }

    const seen = new Set();
    const existing = markersRef.current;
    for (const p of pins) {
      seen.add(p.key);
      let marker = existing.get(p.key);
      if (!marker) {
        const el = pinEl({ html: p.html, size: p.size });
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const cur = propsRef.current;
          if (cur.baliseLureSelecting) return;
          if (p.balise) {
            setSelectedBalise(p.balise);
            return;
          }
          if (p.data && cur.onPlayerClick) cur.onPlayerClick(p.data);
        });
        marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        marker._chaseEl = el;
        existing.set(p.key, marker);
      } else {
        marker.setLngLat([p.lng, p.lat]);
        if (marker._chaseEl && marker._chaseEl.innerHTML !== p.html) {
          marker._chaseEl.innerHTML = p.html;
        }
        marker._chaseData = p;
      }
      marker._chaseData = p;
    }
    for (const [key, marker] of existing) {
      if (!seen.has(key)) {
        marker.remove();
        existing.delete(key);
      }
    }
  }, [
    gameState,
    role,
    mySessionId,
    highlightSessionId,
    chatGeoMarkers,
    baliseLureTarget,
    me,
    mapReady,
    mode3d,
    enable3d,
  ]);

  useEffect(() => {
    const onTap = async () => {
      const map = mapRef.current;
      if (getMapGyro()) {
        gyroOnRef.current = false;
        setMapGyro(false);
        setGyroOn(false);
        if (map && readyRef.current) {
          easeMapBearing(0, NORTH_EASE_MS, { force: true });
        } else {
          bearingRef.current = 0;
          publishMapBearing(0);
        }
        return;
      }
      const res = await requestPermission();
      if (res?.reason === "denied") {
        setMapError("Autorisation boussole refusée. Réglages → Safari → Mouvement et orientation.");
        return;
      }
      gyroOnRef.current = true;
      setMapGyro(true);
      setGyroOn(true);
    };
    window.addEventListener(MAP_PREF_EVENTS.compassTap, onTap);
    return () => window.removeEventListener(MAP_PREF_EVENTS.compassTap, onTap);
  }, [requestPermission, easeMapBearing]);

  if (!gameState) return null;

  return (
    <>
      {mapError && (
        <div className="absolute left-0 right-0 top-3 z-[2000] mx-auto max-w-md rounded-xl bg-red-100 px-4 py-3 text-center text-sm text-red-900 shadow-lg dark:bg-red-950/90 dark:text-red-100">
          {mapError}
          <button type="button" onClick={() => setMapError(null)} className="ml-2 font-semibold underline">
            Fermer
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="map-full-screen h-full w-full"
        style={{ height: "100%", width: "100%" }}
      />

      {selectedBalise && (
        <BaliseSheet
          balise={selectedBalise}
          mySessionId={mySessionId}
          onClose={() => setSelectedBalise(null)}
          onShowOnMap={handleShowBaliseOnMap}
        />
      )}
    </>
  );
}
