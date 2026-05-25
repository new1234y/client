import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Polygon,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "../../lib/map/leafletFix.js";
import {
  iconSelf,
  iconSelfOutOfBounds,
  iconAlly,
  iconAllyOutOfBounds,
  iconCat,
  iconCatOutOfBounds,
  iconPreyExact,
  iconPreyOutOfBounds,
  iconDisconnected,
  iconChatLocation,
} from "../../lib/map/icons.js";
import { BASEMAPS } from "../../lib/map/basemaps.js";
import { offsetMeters } from "../../lib/map/geoOffset.js";
import AnimatedCircle from "./AnimatedCircle.jsx";
import GlobalCircle from "./GlobalCircle.jsx";
import PlayerCircle from "./PlayerCircle.jsx";
import BaliseCircle from "./BaliseCircle.jsx";

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

function FlyToFocus({ center, zoom, tick }) {
  const map = useMap();
  useEffect(() => {
    if (!tick || !center) return;
    map.setView(center, zoom, { animate: true });
  }, [tick, center, zoom, map]);
  return null;
}

function clusterStackIcon(count) {
  const n = Math.min(3, count);
  let html = `<div style="position:relative;width:58px;height:46px;margin:auto">`;
  for (let i = 0; i < n; i++) {
    const left = 6 + i * 11;
    const top = 4 + (i % 2) * 5;
    const z = 5 + i;
    html += `<div style="position:absolute;left:${left}px;top:${top}px;z-index:${z};width:30px;height:30px;border-radius:50%;background:linear-gradient(145deg,#6366f1,#4338ca);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>`;
  }
  if (count > 1) {
    html += `<div style="position:absolute;right:-2px;bottom:-2px;z-index:20;min-width:18px;height:18px;border-radius:9px;background:#0f172a;color:#fff;font:700 10px/18px system-ui;text-align:center;padding:0 4px">${count}</div>`;
  }
  html += "</div>";
  return L.divIcon({
    html,
    className: "map-cluster-stack",
    iconSize: [58, 46],
    iconAnchor: [29, 23],
  });
}

function CollapseClustersOnMapClick({ onClear }) {
  useMapEvents({
    click: () => onClear(),
  });
  return null;
}

function PreventMapClickBounce() {
  useMapEvents({
    click: (e) => {
      // Prevent map from panning when clicking on markers
      if (e.originalEvent?.target?.closest('.leaflet-marker-icon, .leaflet-interactive')) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
      }
    },
  });
  return null;
}

function renderPreyDiscs(list, keyPrefix, onPlayerClick = null, mySessionId) {
  return (list || []).map((p) => {
    if (p.kind === "exact" && p.lat != null && p.lng != null) {
      const ic = p.disconnected 
        ? iconDisconnected 
        : p.outOfBounds ? iconPreyOutOfBounds : iconPreyExact;
      return (
        <Marker
          key={`${keyPrefix}-${p.sessionId}`}
          position={[p.lat, p.lng]}
          icon={ic}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (onPlayerClick) {
                onPlayerClick({ ...p, role: "player" });
              }
            },
          }}
        />
      );
    }
    if (p.kind === "circle" && p.center && p.radiusM != null) {
      const isAdmin = keyPrefix === "admin";
      const color = p.disconnected
        ? "#94a3b8"
        : isAdmin
          ? "#7c3aed"
          : "#fb923c";
      const fillColor = p.disconnected
        ? "#cbd5e1"
        : isAdmin
          ? "#a78bfa"
          : "#f97316";
      const fillOpacity = p.disconnected ? 0.12 : isAdmin ? 0.18 : 0.26;

      return (
        <PlayerCircle
          key={`${keyPrefix}-${p.sessionId}`}
          center={p.center}
          radius={p.radiusM}
          color={color}
          fillColor={fillColor}
          fillOpacity={fillOpacity}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (onPlayerClick) {
                onPlayerClick({ ...p, role: "player" });
              }
            },
          }}
        />
      );
    }
    return null;
  });
}

function gridKey(lat, lng) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
}

function chatPhotoIcon(imageDataUrl) {
  const safe = String(imageDataUrl || "").replace(/'/g, "");
  return L.divIcon({
    className: "chat-photo-marker-wrap",
    html: `<div style="width:40px;height:40px;border-radius:12px;overflow:hidden;border:2px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.4)"><img src='${safe}' alt='' style="width:100%;height:100%;object-fit:cover"/></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function ClusteredMarkers({
  items,
  expandKey,
  setExpandKey,
  onPlayerClick = null,
}) {
  // Render each item as an individual marker (no clustering)
  return (
    <>
      {(items || []).map((it) => (
        <Marker
          key={it.key}
          position={[it.lat, it.lng]}
          icon={it.icon}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (onPlayerClick && it.playerData) {
                onPlayerClick(it.playerData);
              }
            },
          }}
        />
      ))}
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
  geoChatItems = [],
  focusCenter = null,
  focusTick = 0,
  focusZoom = 18,
  onPlayerClick = null,
}) {
  const [expandKey, setExpandKey] = useState(null);
  const [mapError, setMapError] = useState(null);
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

  const centerTarget =
    me?.lat != null && me?.lng != null ? [me.lat, me.lng] : initialCenter;
  const zoomGo = me?.lat != null ? 17 : 14;

  const pickMarkerIcon = useCallback((baseIcon, outOfBoundsIcon, disconnected, outOfBounds) => {
    if (disconnected) return iconDisconnected;
    return outOfBounds ? outOfBoundsIcon : baseIcon;
  }, []);

  const myJam = gameState?.myJamCircle;
  const balises = gameState?.balises || [];

  const chatGeoMarkers = useMemo(() => {
    const photos = [];
    const locations = [];
    for (const m of geoChatItems || []) {
      const la = Number(m.lat);
      const lo = Number(m.lng);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
      if (m.type === "image" && m.image) {
        photos.push({
          id: m.id,
          lat: la,
          lng: lo,
          image: m.image,
          nickname: m.nickname || "",
        });
      } else if (m.type === "location") {
        locations.push({
          id: m.id,
          lat: la,
          lng: lo,
          nickname: m.nickname || "",
          text: m.text || "",
        });
      }
    }
    return { photos, locations };
  }, [geoChatItems]);

  const clusterItems = useMemo(() => {
    const items = [];
    if (me?.lat != null && me?.lng != null) {
      items.push({
        key: `me-${mySessionId}`,
        lat: me.lat,
        lng: me.lng,
        icon: pickMarkerIcon(iconSelf, iconSelfOutOfBounds, false, me.outOfBounds),
        playerData: { ...me, sessionId: mySessionId },
      });
    }
    for (const a of gameState?.allies || []) {
      if (a.sessionId === mySessionId) continue;
      if (a.lat == null || a.lng == null) continue;
      const disc = Boolean(a.disconnected);
      const isAllyMe = a.sessionId === mySessionId;
      const ic = pickMarkerIcon(
        isAllyMe ? iconSelf : iconAlly,
        isAllyMe ? iconSelfOutOfBounds : iconAllyOutOfBounds,
        disc,
        Boolean(a.outOfBounds)
      );
      items.push({
        key: `ally-${a.sessionId}`,
        lat: a.lat,
        lng: a.lng,
        icon: ic,
        playerData: { ...a },
      });
    }
    for (const c of gameState?.catsExact || []) {
      if (c.sessionId === mySessionId) continue;
      if (c.lat == null || c.lng == null) continue;
      const disc = Boolean(c.disconnected);
      const isCatMe = c.sessionId === mySessionId;
      const ic = pickMarkerIcon(
        isCatMe ? iconSelf : iconCat,
        isCatMe ? iconSelfOutOfBounds : iconCatOutOfBounds,
        disc,
        Boolean(c.outOfBounds)
      );
      items.push({
        key: `cat-${c.sessionId}`,
        lat: c.lat,
        lng: c.lng,
        icon: ic,
        playerData: { ...c },
      });
    }
    if (role === "cat") {
      for (const p of gameState?.preyForCat || []) {
        if (p.kind !== "exact" || p.lat == null || p.lng == null) continue;
        const ic = pickMarkerIcon(iconPreyExact, iconPreyOutOfBounds, Boolean(p.disconnected), Boolean(p.outOfBounds));
        items.push({
          key: `prey-${p.sessionId}`,
          lat: p.lat,
          lng: p.lng,
          icon: ic,
          playerData: { ...p, role: "player" },
        });
      }
    }
    for (const p of gameState?.adminPreyPreview || []) {
      if (p.kind !== "exact" || p.lat == null || p.lng == null) continue;
      const ic = pickMarkerIcon(iconPreyExact, iconPreyOutOfBounds, Boolean(p.disconnected), Boolean(p.outOfBounds));
      items.push({
        key: `adm-${p.sessionId}`,
        lat: p.lat,
        lng: p.lng,
        icon: ic,
        playerData: { ...p, role: "player" },
      });
    }
    return items;
  }, [
    me,
    mySessionId,
    gameState?.allies,
    gameState?.catsExact,
    gameState?.preyForCat,
    gameState?.adminPreyPreview,
    role,
    pickMarkerIcon,
  ]);

  if (!gameState) return null;

  const handleTileError = () => {
    setMapError("Impossible de charger la carte. Vérifiez votre connexion internet.");
  };

  return (
    <>
      {mapError && (
        <div className="absolute left-0 right-0 top-3 z-[2000] mx-auto max-w-md rounded-xl bg-red-100 px-4 py-3 text-center text-sm text-red-900 shadow-lg dark:bg-red-950/90 dark:text-red-100">
          {mapError}
          <button 
            type="button"
            onClick={() => setMapError(null)}
            className="ml-2 font-semibold underline"
          >
            Fermer
          </button>
        </div>
      )}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
        attributionControl
      >
        <TileLayer 
          key={basemapId} 
          attribution={bm.attribution} 
          url={bm.url}
          eventHandlers={{
            tileerror: handleTileError,
            loaderror: handleTileError,
          }}
        />
      <PreventMapClickBounce />
      <RecenterOnDemand
        center={centerTarget}
        zoom={zoomGo}
        tick={recenterTick}
      />
      <FlyToFocus center={focusCenter} zoom={focusZoom} tick={focusTick} />
      <ZoomOnTicks zoomInTick={zoomInTick} zoomOutTick={zoomOutTick} />

      {gc && gr != null && (
        <GlobalCircle
          center={{ lat: gc.lat, lng: gc.lng }}
          radius={gr}
        />
      )}

      {myJam?.center && myJam?.radiusM != null && (
        <PlayerCircle
          key="my-jam"
          center={myJam.center}
          radius={myJam.radiusM}
          color="#0284c7"
          fillColor="#0ea5e9"
          fillOpacity={0.16}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (onPlayerClick && me) {
                onPlayerClick({ ...me, sessionId: mySessionId });
              }
            },
          }}
        />
      )}

      {balises.map((balise) => {
        const isBeingCaptured = balise.beingCapturedBy !== null;
        const isMyCapture = balise.beingCapturedBy === mySessionId;
        
        return (
          <BaliseCircle
            key={balise.id}
            center={{ lat: balise.lat, lng: balise.lng }}
            radius={balise.radiusM}
            visualScale={balise.visualScale}
            beingCapturedBy={balise.beingCapturedBy}
            isMyCapture={isMyCapture}
            captureProgress={balise.captureProgress || 0}
          />
        );
      })}

      <ClusteredMarkers
        items={clusterItems}
        expandKey={expandKey}
        setExpandKey={setExpandKey}
        onPlayerClick={onPlayerClick}
      />

      {role === "cat" &&
        renderPreyDiscs(gameState.preyForCat || [], "cat", onPlayerClick, mySessionId)}

      {renderPreyDiscs(gameState.adminPreyPreview || [], "admin", onPlayerClick, mySessionId)}

      {chatGeoMarkers.locations.map((m) => (
        <Marker
          key={`chatloc-${m.id}`}
          position={[m.lat, m.lng]}
          icon={iconChatLocation}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
            },
          }}
        >
          <Popup className="chat-photo-popup" maxWidth={260}>
            <div className="min-w-0">
              {m.nickname ? (
                <p className="mb-1 text-xs font-semibold text-slate-700">{m.nickname}</p>
              ) : null}
              <p className="text-xs text-slate-600">Position partagée dans la discussion</p>
              {m.text ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] text-slate-700">{m.text}</p>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}

      {chatGeoMarkers.photos.map((m) => (
        <Marker
          key={`chatimg-${m.id}`}
          position={[m.lat, m.lng]}
          icon={chatPhotoIcon(m.image)}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
            },
          }}
        >
          <Popup className="chat-photo-popup" maxWidth={280}>
            <div className="min-w-0">
              {m.nickname ? (
                <p className="mb-1 text-xs font-semibold text-slate-700">{m.nickname}</p>
              ) : null}
              <img
                src={m.image}
                alt=""
                className="max-h-64 w-full rounded-lg object-contain"
              />
              <p className="mt-1 text-[10px] text-slate-500">Photo partagée dans la discussion</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
    </>
  );
}
