import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "../../lib/map/leafletFix.js";
import { iconSelf, iconAlly, iconCat, iconPreyExact } from "../../lib/map/icons.js";
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

export default function GameMap({
  gameState,
  role,
  mySessionId,
  basemapId = "osm",
  recenterTick = 0,
}) {
  const defaultCenter = [46.8, 2.5];
  const me = gameState?.me;
  const initialCenter = useMemo(() => {
    if (me?.lat != null && me?.lng != null) return [me.lat, me.lng];
    if (gameState?.gameCenter)
      return [gameState.gameCenter.lat, gameState.gameCenter.lng];
    return defaultCenter;
  }, []);

  const initialZoom = me?.lat != null ? 17 : gameState?.gameCenter ? 14 : 6;
  const gc = gameState?.gameCenter;
  const gr =
    gameState?.effectiveGlobalRadiusM ??
    gameState?.settings?.globalRadiusM;
  const jam = gameState?.myJamCircle;
  const bm = BASEMAPS[basemapId] || BASEMAPS.osm;

  const centerTarget =
    me?.lat != null && me?.lng != null ? [me.lat, me.lng] : initialCenter;
  const zoomGo = me?.lat != null ? 17 : 14;

  if (!gameState) return null;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className="h-full w-full"
      zoomControl
      scrollWheelZoom
      attributionControl
    >
      <TileLayer key={basemapId} attribution={bm.attribution} url={bm.url} />
      <RecenterOnDemand
        center={centerTarget}
        zoom={zoomGo}
        tick={recenterTick}
      />

      {gc && gr != null && (
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
        <Marker position={[me.lat, me.lng]} icon={iconSelf}>
          <Popup>
            Toi ({me.nickname}) —{" "}
            {role === "cat" ? "Chat" : role === "player" ? "Joueur" : ""}
          </Popup>
        </Marker>
      )}

      {role === "player" &&
        jam?.center &&
        jam?.radiusM != null &&
        !me?.spectator &&
        !me?.captured && (
          <AnimatedCircle
            center={jam.center}
            radius={jam.radiusM}
            pathOptions={{
              color: "#22c55e",
              fillColor: "#4ade80",
              fillOpacity: 0.18,
              weight: 2,
              dashArray: "8 6",
            }}
          />
        )}

      {(gameState.allies || []).map((a) => {
        if (a.lat == null || a.lng == null) return null;
        const label =
          a.role === "cat"
            ? `Chat : ${a.nickname}`
            : a.role === "player"
              ? `Joueur : ${a.nickname}`
              : `${a.nickname}`;
        const ic =
          a.role === "cat"
            ? iconCat
            : a.sessionId === mySessionId
              ? iconSelf
              : iconAlly;
        return (
          <Marker key={a.sessionId} position={[a.lat, a.lng]} icon={ic}>
            <Popup>{label}</Popup>
          </Marker>
        );
      })}

      {(gameState.catsExact || []).map((c) => {
        if (c.lat == null || c.lng == null) return null;
        const isMe = c.sessionId === mySessionId;
        return (
          <Marker
            key={c.sessionId}
            position={[c.lat, c.lng]}
            icon={isMe ? iconSelf : iconCat}
          >
            <Popup>{isMe ? "Toi (chat)" : `Chat : ${c.nickname}`}</Popup>
          </Marker>
        );
      })}

      {role === "cat" &&
        (gameState.preyForCat || []).map((p) => {
          if (p.kind === "exact" && p.lat != null && p.lng != null) {
            return (
              <Marker
                key={p.sessionId}
                position={[p.lat, p.lng]}
                icon={iconPreyExact}
              >
                <Popup>Proie (hors zone) : {p.nickname}</Popup>
              </Marker>
            );
          }
          if (p.kind === "circle" && p.center && p.radiusM != null) {
            return (
              <AnimatedCircle
                key={p.sessionId}
                center={p.center}
                radius={p.radiusM}
                pathOptions={{
                  color: "#fb923c",
                  fillColor: "#f97316",
                  fillOpacity: 0.26,
                  weight: 2,
                }}
              >
                <Popup>Zone approximative : {p.nickname}</Popup>
              </AnimatedCircle>
            );
          }
          return null;
        })}
    </MapContainer>
  );
}
