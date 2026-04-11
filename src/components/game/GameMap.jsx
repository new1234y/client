import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polygon,
  CircleMarker,
} from "react-leaflet";
import "../../lib/map/leafletFix.js";
import {
  iconSelf,
  iconAlly,
  iconCat,
  iconPreyExact,
  iconDisconnected,
} from "../../lib/map/icons.js";
import { BASEMAPS } from "../../lib/map/basemaps.js";
import AnimatedCircle from "./AnimatedCircle.jsx";

function RecenterOnDemand({ center, zoom, tick }) {
  const map = useMap();
  useEffect(() => {
    if (!tick || !center) return;
    map.setView(center, zoom, { animate: true });
  }, [tick, center, zoom, map]);
  return null;
}

function ZoomOnTicks({ zoomInTick, zoomOutTick }) {
  const map = useMap();
  useEffect(() => {
    if (!zoomInTick) return;
    map.zoomIn(1);
  }, [zoomInTick, map]);
  useEffect(() => {
    if (!zoomOutTick) return;
    map.zoomOut(1);
  }, [zoomOutTick, map]);
  return null;
}

export default function GameMap({
  gameState,
  role,
  mySessionId,
  basemapId = "osm",
  recenterTick = 0,
  zoomInTick = 0,
  zoomOutTick = 0,
}) {
  const defaultCenter = [46.8, 2.5];
  const me = gameState?.me;
  const initialCenter = useMemo(() => {
    if (me?.lat != null && me?.lng != null) return [me.lat, me.lng];
    if (gameState?.gameCenter)
      return [gameState.gameCenter.lat, gameState.gameCenter.lng];
    return defaultCenter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialZoom = me?.lat != null ? 17 : gameState?.gameCenter ? 14 : 6;
  const gc = gameState?.gameCenter;
  const gr =
    gameState?.effectiveGlobalRadiusM ??
    gameState?.settings?.globalRadiusM;
  const bm = BASEMAPS[basemapId] || BASEMAPS.osm;
  const zoneMode = gameState?.settings?.zoneMode || "circle";
  const cityPolygons = gameState?.settings?.cityPolygons || [];

  const centerTarget =
    me?.lat != null && me?.lng != null ? [me.lat, me.lng] : initialCenter;
  const zoomGo = me?.lat != null ? 17 : 14;

  const pickMarkerIcon = (baseIcon, disconnected) =>
    disconnected ? iconDisconnected : baseIcon;

  if (!gameState) return null;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className="h-full w-full"
      zoomControl={false}
      scrollWheelZoom
      attributionControl
    >
      <TileLayer key={basemapId} attribution={bm.attribution} url={bm.url} />
      <RecenterOnDemand
        center={centerTarget}
        zoom={zoomGo}
        tick={recenterTick}
      />
      <ZoomOnTicks zoomInTick={zoomInTick} zoomOutTick={zoomOutTick} />

      {zoneMode === "city" &&
        cityPolygons.map((ring, idx) => {
          if (!ring?.length) return null;
          const positions = ring.map(([lat, lng]) => [lat, lng]);
          return (
            <Polygon
              key={`city-${idx}`}
              positions={positions}
              pathOptions={{
                color: "#6366f1",
                weight: 2,
                fillColor: "#818cf8",
                fillOpacity: 0.08,
              }}
            />
          );
        })}

      {zoneMode === "circle" && gc && gr != null && (
        <AnimatedCircle
          center={{ lat: gc.lat, lng: gc.lng }}
          radius={gr}
          pathOptions={{
            color: "#818cf8",
            fillColor: "#6366f1",
            fillOpacity: 0.1,
            weight: 3,
          }}
        />
      )}

      {me?.lat != null && me?.lng != null && (
        <Marker position={[me.lat, me.lng]} icon={iconSelf} />
      )}

      {(gameState.allies || []).map((a) => {
        if (a.lat == null || a.lng == null) return null;
        const disc = Boolean(a.disconnected);
        const ic = pickMarkerIcon(
          a.role === "cat"
            ? iconCat
            : a.sessionId === mySessionId
              ? iconSelf
              : iconAlly,
          disc
        );
        return <Marker key={a.sessionId} position={[a.lat, a.lng]} icon={ic} />;
      })}

      {(gameState.catsExact || []).map((c) => {
        if (c.lat == null || c.lng == null) return null;
        const isMe = c.sessionId === mySessionId;
        const disc = Boolean(c.disconnected);
        const ic = pickMarkerIcon(isMe ? iconSelf : iconCat, disc);
        return <Marker key={c.sessionId} position={[c.lat, c.lng]} icon={ic} />;
      })}

      {role === "cat" &&
        (gameState.preyForCat || []).map((p) => {
          if (p.kind === "exact" && p.lat != null && p.lng != null) {
            const ic = pickMarkerIcon(iconPreyExact, Boolean(p.disconnected));
            return (
              <Marker key={p.sessionId} position={[p.lat, p.lng]} icon={ic} />
            );
          }
          if (p.kind === "circle" && p.center && p.radiusM != null) {
            if (zoneMode === "city") {
              return (
                <CircleMarker
                  key={p.sessionId}
                  center={[p.center.lat, p.center.lng]}
                  radius={7}
                  pathOptions={{
                    color: p.disconnected ? "#94a3b8" : "#ea580c",
                    fillColor: p.disconnected ? "#cbd5e1" : "#fb923c",
                    fillOpacity: 0.92,
                    weight: 2,
                  }}
                />
              );
            }
            return (
              <AnimatedCircle
                key={p.sessionId}
                center={p.center}
                radius={p.radiusM}
                pathOptions={{
                  color: p.disconnected ? "#94a3b8" : "#fb923c",
                  fillColor: p.disconnected ? "#cbd5e1" : "#f97316",
                  fillOpacity: p.disconnected ? 0.15 : 0.26,
                  weight: 2,
                  dashArray: p.disconnected ? "4 6" : undefined,
                }}
              />
            );
          }
          return null;
        })}
    </MapContainer>
  );
}
