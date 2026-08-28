import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  iconGhost,
  iconFakePosition,
} from "../../lib/map/icons.js";
import { resolveBasemap } from "../../lib/map/basemaps.js";
import { getOsmApiKey } from "../../lib/map/osmKey.js";
import { offsetMeters } from "../../lib/map/geoOffset.js";
import AnimatedCircle from "./AnimatedCircle.jsx";
import { Polyline } from "react-leaflet";
import GlobalCircle from "./GlobalCircle.jsx";
import PlayerCircle from "./PlayerCircle.jsx";
import BaliseCircle from "./BaliseCircle.jsx";
import BaliseSheet from "./BaliseSheet.jsx";
import DirectionIndicator from "./DirectionIndicator.jsx";
import { useDeviceOrientation } from "../../hooks/useDeviceOrientation.js";
import { getServerTime } from "../../lib/serverTime.js";
import { hasMapboxToken, MAPBOX_TOKEN_EVENT } from "../../lib/map/mapboxKey.js";
import MapboxMap from "./MapboxMap.jsx";

function RecenterOnDemand({ center, zoom, tick }) {
  const map = useMap();
  useEffect(() => {
    if (!tick || !center) return;
    map.setView(center, zoom, { animate: true });
  }, [tick, center, zoom, map]);
  return null;
}

function BaliseLureSelector({ enabled, onSelect }) {
  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      try {
        const { lat, lng } = e.latlng || {};
        if (typeof lat !== "number" || !isFinite(lat)) return;
        if (typeof lng !== "number" || !isFinite(lng)) return;
        if (onSelect) onSelect(lat, lng);
      } catch (err) {
        // On log l'erreur mais on évite de casser toute la carte
        console.error("Erreur lors de la sélection balise-leurre:", err);
      }
    },
  });
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
      // Avec le nouveau ghost, le backend ne renvoie plus de joueurs invisibles dans les cercles;
      // on dessine simplement le cercle normal.
      const isAdmin = keyPrefix === "admin";
      const isOutOfBounds = !!p.outOfBounds;
      const color = p.disconnected
        ? "#94a3b8"
        : isOutOfBounds
          ? "#ef4444"
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

function LeafletGameMap({
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
  highlightSessionId = null,
  onPlayerClick = null,
  baliseLureSelecting = false,
  baliseLureTarget = null,
  onBaliseLureSelect = null,
}) {
  const [expandKey, setExpandKey] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [selectedBalise, setSelectedBalise] = useState(null);
  const mapRef = useRef(null);
  const { heading, needsPermission, requestPermission } = useDeviceOrientation();
  const defaultCenter = [46.8, 2.5];
  const me = gameState?.me;
  const initialCenter = useMemo(() => {
    if (me?.lat != null && me?.lng != null) return [me.lat, me.lng];
    if (gameState?.gameCenter)
      return [gameState.gameCenter.lat, gameState.gameCenter.lng];
    return defaultCenter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialZoom = me?.lat != null ? 17 : gameState?.effectiveGlobalCenter ? 14 : 6;
  const gc = gameState?.effectiveGlobalCenter || gameState?.gameCenter;
  const nextGc = gameState?.nextPhaseCenter;
  const nextGr = gameState?.nextPhaseRadiusM;
  const gr =
    gameState?.effectiveGlobalRadiusM ??
    gameState?.settings?.globalRadiusM;
  const osmKey = getOsmApiKey();
  const bm = resolveBasemap(basemapId, osmKey);

  const centerTarget =
    me?.lat != null && me?.lng != null ? [me.lat, me.lng] : initialCenter;
  const zoomGo = me?.lat != null ? 17 : 14;

  const pickMarkerIcon = useCallback((baseIcon, outOfBoundsIcon, disconnected, outOfBounds) => {
    if (disconnected) return iconDisconnected;
    return outOfBounds ? outOfBoundsIcon : baseIcon;
  }, []);

  const myJam = gameState?.myJamCircle;
  const balises = gameState?.balises || [];
  const myFakePosition = gameState?.me?.fakePosition;
  const now = getServerTime();
  const hasActiveFakePosition = myFakePosition && myFakePosition.until > now;

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
    const selfInvisible = me?.invisUntil && me.invisUntil > getServerTime();
    if (me?.lat != null && me?.lng != null) {
      items.push({
        key: `me-${mySessionId}`,
        lat: me.lat,
        lng: me.lng,
        icon: selfInvisible
          ? iconGhost
          : pickMarkerIcon(iconSelf, iconSelfOutOfBounds, false, me.outOfBounds),
        playerData: { ...me, sessionId: mySessionId },
      });
    }
    for (const a of gameState?.allies || []) {
      if (a.sessionId === mySessionId) continue;
      if (a.lat == null || a.lng == null) continue;
      const disc = Boolean(a.disconnected);
      const isAllyMe = a.sessionId === mySessionId;
      const ghost = Boolean(a.invisible);
      const ic = pickMarkerIcon(
        ghost ? iconGhost : isAllyMe ? iconSelf : iconAlly,
        ghost ? iconGhost : isAllyMe ? iconSelfOutOfBounds : iconAllyOutOfBounds,
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
      const ghost = Boolean(c.invisible);
      const ic = pickMarkerIcon(
        ghost ? iconGhost : isCatMe ? iconSelf : iconCat,
        ghost ? iconGhost : isCatMe ? iconSelfOutOfBounds : iconCatOutOfBounds,
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

  const highlightPos = useMemo(() => {
    if (!highlightSessionId) return null;
    const hit = clusterItems.find(
      (it) => it.playerData?.sessionId === highlightSessionId
    );
    return hit ? [hit.lat, hit.lng] : null;
  }, [highlightSessionId, clusterItems]);

  if (!gameState) return null;

  const shouldShowBaliseLureMarker = useMemo(() => {
    if (!baliseLureTarget || role !== "cat") return false;
    // Always show the lure marker, even after the balise appears
    return true;
  }, [baliseLureTarget, role]);

  const handleTileError = () => {
    setMapError("Impossible de charger la carte. Vérifiez votre connexion internet.");
  };

  const handleBaliseClick = (balise) => {
    if (baliseLureSelecting) return;
    setSelectedBalise(balise);
  };

  const handleShowBaliseOnMap = (center) => {
    if (mapRef.current) {
  // Clamp the zoom to allowed maximum so callers can request deep zooms safely in the future
  const targetZoom = Math.min(24, 17);
  mapRef.current.setView([center.lat, center.lng], targetZoom, { animate: true });
    }
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
        ref={mapRef}
        center={initialCenter}
        zoom={initialZoom}
        className="h-full w-full map-full-screen"
        zoomControl={false}
        scrollWheelZoom
        // Allow much deeper zoom (tiles may limit actual detail). Keep high max to let users zoom in.
        maxZoom={24}
        minZoom={2}
        attributionControl
      >
        {/* If the device requires a user gesture to grant orientation permission (iOS),
            show a clear overlay with explanation and a button the user can tap to enable orientation. */}
        {needsPermission && (
          <div className="absolute left-1/2 top-4 z-[2100] -translate-x-1/2 w-[min(92%,420px)]">
            <div className="rounded-2xl bg-gradient-to-br from-white/95 to-blue-50/95 px-5 py-4 text-sm shadow-2xl dark:from-slate-900/95 dark:to-slate-800/95 dark:text-slate-100 border border-blue-200/50 dark:border-slate-700/50">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-slate-900 dark:text-white">Activer la boussole</div>
                  <div className="mt-2 text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Pour une expérience optimale, le jeu a besoin d'accéder à la boussole de votre téléphone. Cela permet d'afficher votre direction en temps réel sur la carte.
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await requestPermission();
                          if (!res.granted) {
                            setMapError(
                              "Autorisation refusée. Pour activer la boussole : Réglages → Safari → Mouvement et orientation, puis rechargez la page."
                            );
                          }
                        } catch (err) {
                          setMapError("Erreur lors de la demande d'autorisation. Vérifiez que vous êtes sur Safari et que la page est servie en HTTPS.");
                        }
                      }}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
                    >
                      Activer la boussole
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapError(
                          "Pour activer la boussole manuellement : Réglages → Safari → Mouvement et orientation, activez-le, puis rechargez la page."
                        );
                      }}
                      className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Passer pour le moment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <TileLayer
          key={`${basemapId}-${osmKey ? "keyed" : "osm"}`}
          attribution={bm.attribution}
          url={bm.url}
          // If the basemap provides a native max zoom, pass it so Leaflet can use hi-res tiles when available
          maxNativeZoom={bm.maxNativeZoom}
          maxZoom={24}
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

      {highlightPos && (
        <CircleMarker
          center={highlightPos}
          radius={22}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#fbbf24",
            fillOpacity: 0.25,
            weight: 3,
            className: "animate-pulse",
          }}
        />
      )}

      {shouldShowBaliseLureMarker && (
        <CircleMarker
          center={[baliseLureTarget.lat, baliseLureTarget.lng]}
          radius={14}
          pathOptions={{
            color: "#a855f7",
            fillColor: "#c4b5fd",
            fillOpacity: 0.55,
            weight: 3,
          }}
        />
      )}

      <BaliseLureSelector
        enabled={role === "cat" && baliseLureSelecting}
        onSelect={(lat, lng) => {
          if (onBaliseLureSelect) onBaliseLureSelect(lat, lng);
        }}
      />

      {gc && gr != null && !(
        me?.outOfBoundsOverrideUntil && me.outOfBoundsOverrideUntil > getServerTime()
      ) && (
        <GlobalCircle
          center={{ lat: gc.lat, lng: gc.lng }}
          radius={gr}
          nextCenter={nextGc ? { lat: nextGc.lat, lng: nextGc.lng } : null}
          nextRadius={nextGr}
          player={me?.lat != null && me?.lng != null ? { lat: me.lat, lng: me.lng } : null}
        />
      )}

      {/* Line to next safe zone if we are a player and NOT already inside it */}
      {(() => {
        const hasCoords = Number.isFinite(me?.lat) && Number.isFinite(me?.lng);
        const hasNext = Number.isFinite(nextGc?.lat) && Number.isFinite(nextGc?.lng);
        const hasRadius = Number.isFinite(nextGr);
        if (!hasCoords || !hasNext || !hasRadius) return null;
        const R = 6371000;
        const dLat = ((nextGc.lat - me.lat) * Math.PI) / 180;
        const dLon = ((nextGc.lng - me.lng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((me.lat * Math.PI) / 180) * Math.cos((nextGc.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist <= nextGr) return null;
        return (
          <Polyline
            positions={[[me.lat, me.lng], [nextGc.lat, nextGc.lng]]}
            pathOptions={{
              color: "#10b981",
              weight: 2,
              dashArray: "5, 5",
              opacity: 0.7
            }}
          />
        );
      })()}

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
              // En mode balise-leurre, le clic doit servir uniquement à placer la balise, pas à ouvrir la fiche joueur
              if (baliseLureSelecting) return;
              if (onPlayerClick && me) {
                onPlayerClick({ ...me, sessionId: mySessionId });
              }
            },
          }}
        />
      )}

      {/* Direction indicator for player orientation */}
      {me?.lat != null && me?.lng != null && heading != null && (
        <DirectionIndicator
          center={{ lat: me.lat, lng: me.lng }}
          heading={heading}
          jamRadius={myJam?.radiusM ?? 80}
          isOutside={Boolean(me?.outOfBounds)}
        />
      )}

      {/* Afficher la fausse position et son cercle de brouillage pour le joueur lui-même */}
      {hasActiveFakePosition && myFakePosition?.lat != null && myFakePosition?.lng != null && (
        <>
          {/* Marqueur de fausse position */}
          <Marker
            key="fake-position-marker"
            position={[myFakePosition.lat, myFakePosition.lng]}
            icon={iconFakePosition}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                // En mode balise-leurre, le clic doit servir uniquement à placer la balise
                if (baliseLureSelecting) return;
              },
            }}
          >
            <Popup className="fake-position-popup" maxWidth={200}>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold text-purple-700">Fausse position</p>
                <p className="text-[10px] text-slate-600">Les autres joueurs voient cette position</p>
                <p className="mt-1 text-[10px] text-slate-500">Expire dans {Math.max(0, Math.ceil((myFakePosition.until - now) / 1000))}s</p>
              </div>
            </Popup>
          </Marker>

          {/* Cercle de brouillage de la fausse position (visible uniquement par le joueur lui-même) */}
          {role === "player" && myJam?.radiusM != null && (
            <PlayerCircle
              key="fake-jam"
              center={myFakePosition.jamCircleCenter || { lat: myFakePosition.lat, lng: myFakePosition.lng }}
              radius={myJam.radiusM}
              color="#8b5cf6"
              fillColor="#a78bfa"
              fillOpacity={0.2}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  // En mode balise-leurre, le clic doit servir uniquement à placer la balise
                  if (baliseLureSelecting) return;
                },
              }}
            />
          )}
        </>
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
            onClick={() => handleBaliseClick(balise)}
          />
        );
      })}

      <ClusteredMarkers
        items={clusterItems}
        expandKey={expandKey}
        setExpandKey={setExpandKey}
        onPlayerClick={baliseLureSelecting ? null : onPlayerClick}
      />

      {/* Afficher les cercles de brouillage des alliés quand ils ont une fausse position */}
      {(gameState?.allies || []).map((ally) => {
        if (ally.sessionId === mySessionId) return null;
        if (!ally.jamCircleCenter || !ally.jamCircleRadiusM) return null;
        return (
          <PlayerCircle
            key={`ally-jam-${ally.sessionId}`}
            center={ally.jamCircleCenter}
            radius={ally.jamCircleRadiusM}
            color="#d97706"
            fillColor="#fbbf24"
            fillOpacity={0.16}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                // En mode balise-leurre, le clic doit servir uniquement à placer la balise, pas à ouvrir la fiche joueur
                if (baliseLureSelecting) return;
                if (onPlayerClick) {
                  onPlayerClick({ ...ally, role: "player" });
                }
              },
            }}
          />
        );
      })}

      {role === "cat" &&
        renderPreyDiscs(
          gameState.preyForCat || [],
          "cat",
          baliseLureSelecting ? null : onPlayerClick,
          mySessionId
        )}

      {renderPreyDiscs(
        gameState.adminPreyPreview || [],
        "admin",
        baliseLureSelecting ? null : onPlayerClick,
        mySessionId
      )}

      {chatGeoMarkers.locations.map((m) => (
        <Marker
          key={`chatloc-${m.id}`}
          position={[m.lat, m.lng]}
          icon={iconChatLocation}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              // En mode balise-leurre, le clic doit servir uniquement à placer la balise
              if (baliseLureSelecting) return;
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
              // En mode balise-leurre, le clic doit servir uniquement à placer la balise
              if (baliseLureSelecting) return;
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


export default function GameMap(props) {
  const [useMapbox, setUseMapbox] = useState(() => hasMapboxToken());
  useEffect(() => {
    const sync = () => setUseMapbox(hasMapboxToken());
    window.addEventListener(MAPBOX_TOKEN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MAPBOX_TOKEN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (useMapbox) return <MapboxMap {...props} />;
  return <LeafletGameMap {...props} />;
}
