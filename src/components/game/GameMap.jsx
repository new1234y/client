import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "../../lib/map/leafletFix.js";
import {
  iconSelf,
  iconAlly,
  iconCat,
  iconPreyExact,
  iconCaptured,
  iconDisconnected,
} from "../../lib/map/icons.js";
import { BASEMAPS } from "../../lib/map/basemaps.js";
import AnimatedCircle from "./AnimatedCircle.jsx";

/* ── Imperative map controls ─────────────────────────────── */
function MapController({ centerTarget, zoomTarget, recenterTick, zoomInTick, zoomOutTick }) {
  const map = useMap();

  useEffect(() => {
    if (!recenterTick || !centerTarget) return;
    map.setView(centerTarget, zoomTarget, { animate: true, duration: 0.6 });
  }, [recenterTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!zoomInTick) return;
    map.setZoom(map.getZoom() + 1, { animate: true });
  }, [zoomInTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!zoomOutTick) return;
    map.setZoom(map.getZoom() - 1, { animate: true });
  }, [zoomOutTick]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/* ── Shrinking zone — two circles: current + next ────────── */
function ZoneCircles({ center, currentRadius, nextRadius }) {
  if (!center || currentRadius == null) return null;

  return (
    <>
      {/* Current zone — solid indigo */}
      <AnimatedCircle
        center={center}
        radius={currentRadius}
        pathOptions={{
          color: "#6366f1",
          fillColor: "#6366f1",
          fillOpacity: 0.07,
          weight: 2.5,
        }}
      />
      {/* Next zone — dashed orange (shown only when shrink is active and radii differ) */}
      {nextRadius != null && Math.abs(nextRadius - currentRadius) > 5 && (
        <AnimatedCircle
          center={center}
          radius={nextRadius}
          pathOptions={{
            color: "#f97316",
            fillColor: "#f97316",
            fillOpacity: 0.04,
            weight: 2,
            dashArray: "10 7",
          }}
        />
      )}
    </>
  );
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initialZoom = me?.lat != null ? 16 : gameState?.gameCenter ? 14 : 6;

  const gc = gameState?.gameCenter;
  const currentRadius =
    gameState?.effectiveGlobalRadiusM ?? gameState?.settings?.globalRadiusM;
  const nextRadius = gameState?.nextPhaseRadiusM;
  const jam = gameState?.myJamCircle;
  const bm = BASEMAPS[basemapId] || BASEMAPS.osm;

  const centerTarget =
    me?.lat != null ? [me.lat, me.lng] : initialCenter;
  const zoomOnRecenter = me?.lat != null ? 16 : 14;

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

      <MapController
        centerTarget={centerTarget}
        zoomTarget={zoomOnRecenter}
        recenterTick={recenterTick}
        zoomInTick={zoomInTick}
        zoomOutTick={zoomOutTick}
      />

      {/* ── Game zone circles (current + next) ── */}
      {gc && currentRadius != null && (
        <ZoneCircles
          center={{ lat: gc.lat, lng: gc.lng }}
          currentRadius={currentRadius}
          nextRadius={nextRadius}
        />
      )}

      {/* ── My jam circle (prey only) ── */}
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
              fillOpacity: 0.15,
              weight: 2,
              dashArray: "8 6",
            }}
          />
        )}

      {/* ── Self marker ── */}
      {me?.lat != null && me?.lng != null && (
        <Marker position={[me.lat, me.lng]} icon={iconSelf}>
          <Popup>
            <strong>{me.nickname}</strong>
            <br />
            {role === "cat" ? "Chat" : role === "player" ? "Joueur" : ""}
          </Popup>
        </Marker>
      )}

      {/* ── Allies / visible players ── */}
      {(gameState.allies || []).map((a) => {
        if (a.sessionId === mySessionId) return null;
        if (a.lat == null || a.lng == null) return null;

        const isCatRole = a.role === "cat";
        const isDisconnected = a.disconnected;
        const isCaptured = a.captured;

        let icon = isCatRole ? iconCat : iconAlly;
        if (isCaptured) icon = iconCaptured;
        else if (isDisconnected) icon = iconDisconnected;

        const label = isCatRole
          ? `Chat : ${a.nickname}`
          : `Joueur : ${a.nickname}`;

        return (
          <Marker key={a.sessionId} position={[a.lat, a.lng]} icon={icon}>
            <Popup>
              <strong>{label}</strong>
              {isDisconnected && <><br /><span style={{ color: "#ef4444" }}>Deconnecte</span></>}
              {isCaptured && <><br /><span style={{ color: "#94a3b8" }}>Capture</span></>}
            </Popup>
          </Marker>
        );
      })}

      {/* ── Cats exact (visible to other cats) ── */}
      {(gameState.catsExact || []).map((c) => {
        if (c.lat == null || c.lng == null) return null;
        const isMe = c.sessionId === mySessionId;
        if (isMe) return null; // already drawn as iconSelf
        return (
          <Marker key={c.sessionId} position={[c.lat, c.lng]} icon={iconCat}>
            <Popup>
              <strong>Chat : {c.nickname}</strong>
              {c.disconnected && <><br /><span style={{ color: "#ef4444" }}>Deconnecte</span></>}
            </Popup>
          </Marker>
        );
      })}

      {/* ── Prey for cats (exact or approximate circle) ── */}
      {role === "cat" &&
        (gameState.preyForCat || []).map((p) => {
          if (p.kind === "exact" && p.lat != null && p.lng != null) {
            return (
              <Marker
                key={p.sessionId}
                position={[p.lat, p.lng]}
                icon={p.disconnected ? iconDisconnected : iconPreyExact}
              >
                <Popup>
                  <strong>Proie : {p.nickname}</strong>
                  {p.disconnected && <><br /><span style={{ color: "#ef4444" }}>Deconnecte</span></>}
                </Popup>
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
                  color: "#f97316",
                  fillColor: "#f97316",
                  fillOpacity: 0.22,
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
