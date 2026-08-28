import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { useGeolocation } from "./hooks/useGeolocation.js";
import { useTheme } from "./context/ThemeContext.jsx";
import GameMap from "./components/game/GameMap.jsx";
import GameSummary from "./components/summary/GameSummary.jsx";
import QRModal from "./components/game/QRModal.jsx";
import ScannerModal from "./components/game/ScannerModal.jsx";
import MapControls from "./components/game/MapControls.jsx";
import SharePartyModal from "./components/game/SharePartyModal.jsx";
import PowerCard from "./components/powers/PowerCard.jsx";
import { NotificationContainer, useNotifications } from "./components/ui/NotificationSystem.jsx";
import Button from "./components/ui/Button.jsx";
import ConfigHint from "./components/ui/ConfigHint.jsx";
import DiscreteSlider from "./components/ui/DiscreteSlider.jsx";
import SliderWithParticles from "./components/ui/SliderWithParticles.jsx";
import AnimatedPrice from "./components/ui/AnimatedPrice.jsx";
import { getGameByCode } from "./supabase.js";
import PartyChatPanel from "./components/game/PartyChatPanel.jsx";
import PlayerSheet from "./components/game/PlayerSheet.jsx";
import BottomNav from "./components/ui/BottomNav.jsx";
import CircularLobby from "./components/CircularLobby.jsx";
import CoinFeed from "./components/game/CoinFeed.jsx";
import MapHud from "./components/game/MapHud.jsx";
import CoinsBadge, { CoinsHistoryModal } from "./components/game/CoinsBadge.jsx";
import { PlayerModal } from "./components/game/GameStatusModal.jsx";
import SocialPanel from "./components/game/SocialPanel.jsx";
import { RoleModal, ZoneModal, GameModal } from "./components/game/GameModals.jsx";
import { ensureSocketReady } from "./lib/backend.js";
import { resolvePlayerMapFocus } from "./lib/resolvePlayerMapFocus.js";
import { playGhostNoiseSound } from "./lib/playGhostNoiseSound.js";
import SettingsPage from "./components/SettingsPage.jsx";
import HomePage from "./components/HomePage.jsx";
import BrandMark from "./components/ui/BrandMark.jsx";
import logger from "./lib/logger.js";
import { getOsmApiKey } from "./lib/map/osmKey.js";
import { hasMapboxToken, MAPBOX_TOKEN_EVENT } from "./lib/map/mapboxKey.js";
import { getMapStyleId, hasUserPickedMapStyle, MAPBOX_STYLES, MAP_PREF_EVENTS, setMapStyleId } from "./lib/map/mapPrefs.js";
import { syncServerTime } from "./lib/serverTime.js";
import { haptic } from "./lib/haptic.js";
import SegmentedControl from "./components/ui/SegmentedControl.jsx";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// localStorage keys for session persistence
const LS_SESSION_KEY = "chase_gps_session";
const LS_ROOM_KEY = "chase_gps_room";
const LS_NICKNAME_KEY = "chase_gps_nickname";
const LS_LAST_NICKNAME_KEY = "chase_gps_last_nickname";
const LS_LAST_ROOM_KEY = "chase_gps_last_room";
const LS_LAST_SESSION_KEY = "chase_gps_last_session";

function saveSession(sessionId, roomCode, nickname) {
  logger.log('[saveSession] Called with:', { sessionId, roomCode, nickname });
  try {
    // Save to main keys
    localStorage.setItem(LS_SESSION_KEY, sessionId);
    localStorage.setItem(LS_ROOM_KEY, roomCode);
    localStorage.setItem(LS_NICKNAME_KEY, nickname);
    // Also save to backup keys (for crash recovery)
    localStorage.setItem(LS_LAST_SESSION_KEY, sessionId);
    localStorage.setItem(LS_LAST_ROOM_KEY, roomCode);
    localStorage.setItem(LS_LAST_NICKNAME_KEY, nickname);
    logger.log('[saveSession] Session saved successfully (main + backup)');
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
  }
}

function loadSession() {
  logger.log('[loadSession] Called');
  try {
    const sessionId = localStorage.getItem(LS_SESSION_KEY);
    const roomCode = localStorage.getItem(LS_ROOM_KEY);
    const nickname = localStorage.getItem(LS_NICKNAME_KEY);
    logger.log('[loadSession] Loaded:', { sessionId, roomCode, nickname });
    if (sessionId && roomCode) {
      return { sessionId, roomCode, nickname: nickname || "Joueur" };
    }
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
  }
  logger.log('[loadSession] No session found');
  return null;
}

// Also try to load from backup keys (in case main keys were cleared)
function loadSessionBackup() {
  logger.log('[loadSessionBackup] Called');
  try {
    const sessionId = localStorage.getItem(LS_LAST_SESSION_KEY);
    const roomCode = localStorage.getItem(LS_LAST_ROOM_KEY);
    const nickname = localStorage.getItem(LS_LAST_NICKNAME_KEY);
    logger.log('[loadSessionBackup] Loaded:', { sessionId, roomCode, nickname });
    if (sessionId && roomCode) {
      return { sessionId, roomCode, nickname: nickname || "Joueur" };
    }
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
  }
  logger.log('[loadSessionBackup] No backup session found');
  return null;
}

function clearSession() {
  logger.log('[clearSession] Called');
  try {
    localStorage.removeItem(LS_SESSION_KEY);
    localStorage.removeItem(LS_ROOM_KEY);
    localStorage.removeItem(LS_NICKNAME_KEY);
    logger.log('[clearSession] Session cleared (main keys only, backup preserved)');
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
  }
}

function clearAllSessions() {
  logger.log('[clearAllSessions] Called');
  try {
    localStorage.removeItem(LS_SESSION_KEY);
    localStorage.removeItem(LS_ROOM_KEY);
    localStorage.removeItem(LS_NICKNAME_KEY);
    localStorage.removeItem(LS_LAST_SESSION_KEY);
    localStorage.removeItem(LS_LAST_ROOM_KEY);
    localStorage.removeItem(LS_LAST_NICKNAME_KEY);
    logger.log('[clearAllSessions] All sessions cleared');
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
  }
}

function saveLastNickname(nickname) {
  logger.log('[saveLastNickname] Called with:', { nickname });
  try {
    localStorage.setItem(LS_LAST_NICKNAME_KEY, nickname);
    logger.log('[saveLastNickname] Saved');
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
  }
}

function loadLastNickname() {
  logger.log('[loadLastNickname] Called');
  try {
    const result = localStorage.getItem(LS_LAST_NICKNAME_KEY) || "";
    logger.log('[loadLastNickname] Result:', result);
    return result;
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
    return "";
  }
}

function loadLastRoom() {
  logger.log('[loadLastRoom] Called');
  try {
    const result = localStorage.getItem(LS_LAST_ROOM_KEY) || "";
    logger.log('[loadLastRoom] Result:', result);
    return result;
  } catch (e) {
    logger.warn("localStorage non disponible:", e);
    return "";
  }
}

function roleBadgeText(p) {
  logger.log('[roleBadgeText] Called with:', { role: p.role, originalRole: p.originalRole, spectator: p.spectator });
  if (p.spectator) return "Spectateur";
  if (p.role === "cat" && p.originalRole === "player") return "Chat (devenu chat)";
  if (p.role === "cat") return "Chat";
  if (p.role === "player" && p.originalRole === "cat") return "Souris (ex-chat)";
  return "Souris";
}

function getCodeFromUrl() {
  logger.log('[getCodeFromUrl] Called');
  try {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("code") || "";
    logger.log('[getCodeFromUrl] Result:', result);
    return result;
  } catch {
    logger.log('[getCodeFromUrl] Error parsing URL');
    return "";
  }
}

function getRecapIdFromPath() {
  logger.log('[getRecapIdFromPath] Called');
  try {
    const m = window.location.pathname.match(/^\/recap\/([A-Za-z0-9]+)\/?$/);
    const result = m ? m[1].toUpperCase() : null;
    logger.log('[getRecapIdFromPath] Result:', result);
    return result;
  } catch {
    logger.log('[getRecapIdFromPath] Error parsing path');
    return null;
  }
}

function ReconnectModal({ isReconnecting, reconnectAttempt, onCancel, onRetry, lastError, reason }) {
  if (!isReconnecting) return null;

  let title = "Reconnexion";
  let description = "La connexion a été perdue.";
  let showSpinner = reconnectAttempt > 0;

  if (reason === "lost_connection") {
    title = "Connexion perdue";
    description = "Tentative de reconnexion automatique...";
  } else if (reason === "session_found") {
    title = "Session trouvée";
    description = "Une partie en cours a été détectée.";
    showSpinner = false;
  } else if (reason === "kicked") {
    title = "Expulsé";
    description = "Vous avez été expulsé de la partie.";
    showSpinner = false;
  }

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-white">
        {showSpinner ? (
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        ) : (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>

        {reconnectAttempt > 0 && (
          <p className="mb-2 text-xs font-medium text-blue-600 dark:text-blue-400">
            Tentative {reconnectAttempt}... (Prochaine dans 5s)
          </p>
        )}

        {lastError && (
          <p className="mb-4 text-xs text-red-600 dark:text-red-400">{lastError}</p>
        )}

        <div className="flex flex-col gap-2">
          {reason === "lost_connection" ? (
            <>
              <button
                type="button"
                onClick={onRetry}
                disabled={reconnectAttempt > 0}
                className="min-h-11 w-full rounded-full bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Réessayer maintenant
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-11 w-full rounded-full border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  Abandonner
                </button>
              )}
            </>
          ) : (
            <>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={reconnectAttempt > 0}
                  className="min-h-11 w-full rounded-full bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {reason === "session_found" ? "Reprendre" : "Se reconnecter"}
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-11 w-full rounded-full border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {reason === "kicked" ? "Ok" : "Quitter"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { formatDurationMs } from "./lib/format";

function CatMapLockOverlay({ mapUnlockAt, socket, getServerTime }) {
  const [secLeft, setSecLeft] = useState(0);
  const didRefresh = useRef(false);

  useEffect(() => {
    didRefresh.current = false;
  }, [mapUnlockAt]);

  useEffect(() => {
    if (!mapUnlockAt) return;
    const nowFn = typeof getServerTime === "function" ? getServerTime : () => Date.now();
    const tick = () => {
      const s = Math.max(0, Math.ceil((mapUnlockAt - nowFn()) / 1000));
      setSecLeft(s);
      if (s <= 0 && !didRefresh.current) {
        didRefresh.current = true;
        socket?.emit("refresh_state");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mapUnlockAt, socket, getServerTime]);

  const formatted = formatDurationMs(secLeft * 1000);

  return (
    <div className="flex h-full flex-col justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 text-slate-950 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          Chat · carte verrouillée
        </p>
        <p className="mt-3 text-center text-5xl font-black tabular-nums text-slate-900 dark:text-white">
          {formatted}
        </p>
        <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400">
          La carte s’ouvre automatiquement à la fin du délai. Vous pouvez consulter
          l’onglet Joueurs : le compte à rebours reste visible en haut de l’écran.
        </p>
      </div>
    </div>
  );
}

/** Compte à rebours verrouillage carte chat — visible sur tous les onglets */
function CatLockCountdownHeader({ mapUnlockAt, socket, getServerTime }) {
  const [secLeft, setSecLeft] = useState(0);
  const didRefresh = useRef(false);

  useEffect(() => {
    didRefresh.current = false;
  }, [mapUnlockAt]);

  useEffect(() => {
    if (!mapUnlockAt) return;
    const nowFn = typeof getServerTime === "function" ? getServerTime : () => Date.now();
    const tick = () => {
      const s = Math.max(0, Math.ceil((mapUnlockAt - nowFn()) / 1000));
      setSecLeft(s);
      if (s <= 0 && !didRefresh.current) {
        didRefresh.current = true;
        socket?.emit("refresh_state");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mapUnlockAt, socket, getServerTime]);

  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold tabular-nums text-orange-800 ring-1 ring-orange-200 dark:bg-orange-950/80 dark:text-orange-100 dark:ring-orange-800">
  Carte · {formatDurationMs(secLeft * 1000)}
    </span>
  );
}

// Settings button component
function SettingsButton({ size = "md" }) {
  const navigate = useNavigate();
  const sizeClasses = size === "sm"
    ? "h-11 w-11 text-sm"
    : "px-3 py-2 text-xs";

  const handleClick = (e) => {
    e.stopPropagation();
    navigate("/settings");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${sizeClasses}`}
      title="Paramètres"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {size !== "sm" && "Paramètres"}
    </button>
  );
}

export default function App() {
  const { theme } = useTheme();
  const { notifications, addNotification, removeNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [entryMode, setEntryMode] = useState("create");
  const [entryBusyKind, setEntryBusyKind] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState("entry");
  const [resumeCandidate, setResumeCandidate] = useState(null);
  const [nickname, setNickname] = useState(() => {
    const saved = loadSession();
    return saved?.nickname || loadLastNickname();
  });
  const [roomCodeInput, setRoomCodeInput] = useState(() => getCodeFromUrl());
  const [rejoinCandidate, setRejoinCandidate] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [lobby, setLobby] = useState(null);
  const [rolesReveal, setRolesReveal] = useState(null);
  const [role, setRole] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);
  const [nicknameError, setNicknameError] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [gameTab, setGameTab] = useState("map");
  const [mapBasemap, setMapBasemap] = useState(() => {
    try {
      if (hasMapboxToken()) {
        const fallback = (window.localStorage.getItem("chase-gps-theme") === "dark") ? "dark" : "light";
        return getMapStyleId(fallback);
      }
      const stored = window.localStorage.getItem("chase_gps_map_style");
      if (stored && stored !== "3d") return stored;
    } catch {}
    return "osm";
  });
  const [coinHistory, setCoinHistory] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem("chase_gps_coin_log");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const showScanRef = useRef(false);
  showScanRef.current = showScan;
  const prevMeRef = useRef(null);
  useEffect(() => {
    const meNow = gameState?.me || null;
    const prev = prevMeRef.current;
    if (meNow) {
      const nowCapturedPlayer = meNow.role === "player" && !!meNow.captured && !meNow.spectator;
      const prevCapturedPlayer = prev && prev.role === "player" && !!prev.captured && !prev.spectator;
      if (!prevCapturedPlayer && nowCapturedPlayer) {
        setShowQr(true);
      }
      if (showScan && meNow.role !== "cat") {
        setShowScan(false);
      }
    }
    prevMeRef.current = meNow;
  }, [gameState?.me, showQr, showScan]);
  const [recenterTick, setRecenterTick] = useState(0);
  const [zoomInTick, setZoomInTick] = useState(0);
  const [zoomOutTick, setZoomOutTick] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Derived jam state (computed from gameState) and transient notification hooks
  const jamBase = gameState ? Number(gameState.jamRadiusBaseM || gameState.settings?.jamRadiusM || 80) : 80;
  const jamScale = gameState ? Number(gameState.jamRadiusScale || 1) : 1;
  const jamRadius = jamBase * jamScale;
  let jamLabel = "Normal";
  let jamLevel = "normal";
  if (jamScale < 0.99) {
    jamLabel = "Rétréci";
    jamLevel = "small";
  } else if (jamScale > 1.01) {
    jamLabel = "Agrandit";
    jamLevel = "large";
  }

  const [recentJamNotification, setRecentJamNotification] = useState(null);
  const [baliseBlockedNotification, setBaliseBlockedNotification] = useState(null);
  const prevJamLevelRef = useRef('normal');
  const recentJamTimeoutRef = useRef(null);
  const baliseBlockedTimeoutRef = useRef(null);

  // Side-effect: when jamLevel transitions from normal -> non-normal create a 2s transient notification
  useEffect(() => {
    // Trigger a transient (2s) notification on any jamLevel change
    if (jamLevel !== prevJamLevelRef.current) {
      const now = getServerTime();
      const notif = {
        kind: 'jam',
        label: jamLevel,
        radiusM: jamRadius,
        startedAt: now,
        durationMs: 2000,
      };
      setRecentJamNotification(notif);
      if (recentJamTimeoutRef.current) clearTimeout(recentJamTimeoutRef.current);
      recentJamTimeoutRef.current = setTimeout(() => {
        setRecentJamNotification(null);
        recentJamTimeoutRef.current = null;
      }, 2000);
    }
    prevJamLevelRef.current = jamLevel;
    return undefined;
  }, [jamLevel, jamRadius]);

  const pushCoin = useCallback((amount, reason) => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) return;
    setCoinHistory((prev) => {
      const next = [
        { id: Date.now() + "-" + Math.random().toString(16).slice(2), amount: n, reason: reason || "Pieces", timestamp: Date.now() },
        ...prev,
      ].slice(0, 80);
      try { window.sessionStorage.setItem("chase_gps_coin_log", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (!hasUserPickedMapStyle() && hasMapboxToken()) {
      setMapBasemap(theme === "dark" ? "dark" : "light");
    }
  }, [theme]);

  useEffect(() => {
    if (!socket) return undefined;
    const mine = (id) => id && id === sessionIdRef.current;
    const onLost = (data) => {
      if (mine(data.sessionId)) pushCoin(-(Number(data.coinsLost) || 0), data.reason || "Perte");
    };
    const onGain = (data) => {
      if (data.sessionId && !mine(data.sessionId)) return;
      const amt = Number(data.awardedCoins ?? data.amount ?? data.coins);
      if (!Number.isFinite(amt) || amt === 0) return;
      pushCoin(amt, data.reason || "Gain");
    };
    const onBalise = (data) => {
      if (!mine(data.sessionId)) return;
      pushCoin(Number.isFinite(data.awardedCoins) ? data.awardedCoins : 10, "Capture de balise");
    };
    const onSurvive = (data) => {
      if (!mine(data.sessionId)) return;
      const amt = Number(data.awardedCoins ?? data.amount ?? data.coins);
      if (!Number.isFinite(amt) || amt === 0) return;
      pushCoin(amt, data.reason || "Survie de zone");
    };
    socket.on("coins_lost", onLost);
    socket.on("coin_gain", onGain);
    socket.on("coins_gained", onGain);
    socket.on("balise_captured", onBalise);
    socket.on("zone_survive", onSurvive);
    socket.on("zone_survived", onSurvive);
    return () => {
      socket.off("coins_lost", onLost);
      socket.off("coin_gain", onGain);
      socket.off("coins_gained", onGain);
      socket.off("balise_captured", onBalise);
      socket.off("zone_survive", onSurvive);
      socket.off("zone_survived", onSurvive);
    };
  }, [socket, pushCoin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recentJamTimeoutRef.current) {
        clearTimeout(recentJamTimeoutRef.current);
        recentJamTimeoutRef.current = null;
      }
    };
  }, []);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectError, setReconnectError] = useState(null);
  const [reconnectReason, setReconnectReason] = useState(null);
  const [midJoinWait, setMidJoinWait] = useState(null);
  const [joinRequestQueue, setJoinRequestQueue] = useState([]);
  const [partyChatMessages, setPartyChatMessages] = useState([]);
  const [captureCooldownUntil, setCaptureCooldownUntil] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false
  );
  const [showShareParty, setShowShareParty] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [recapSlug, setRecapSlug] = useState(() => getRecapIdFromPath());
  const [recapData, setRecapData] = useState(null);
  const [recapErr, setRecapErr] = useState(false);
  const [recapLoading, setRecapLoading] = useState(() => Boolean(getRecapIdFromPath()));
  const [isOutOfBounds, setIsOutOfBounds] = useState(false);
  const outOfBoundsAudioRef = useRef(null);
  const noiseAudioRef = useRef(null);
  const sharedAudioContextRef = useRef(null);
  const [activeNoise, setActiveNoise] = useState(null); // { startedAt, durationSec, volume, by }
  const [noiseUiNow, setNoiseUiNow] = useState(() => Date.now());
  const [invisNotification, setInvisNotification] = useState(null); // { scope, targetNames, durationSec, startedAt }
  const lastNicknameRef = useRef("");
  const sessionIdRef = useRef(null);
  const isHostRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const entryReqRef = useRef(0);
  const onJoinRef = useRef(null);
  const reconnectRetryRef = useRef(null);
  const [reconnectUiNow, setReconnectUiNow] = useState(() => Date.now());
  const [focusCenter, setFocusCenter] = useState(null);
  const [focusTick, setFocusTick] = useState(0);
  const [focusZoom, setFocusZoom] = useState(18);
  const [highlightSessionId, setHighlightSessionId] = useState(null);
  const [localCooldowns, setLocalCooldowns] = useState({});

  useEffect(() => {
    if (gameState?.me?.powerCooldowns) {
      setLocalCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [k, v] of Object.entries(gameState.me.powerCooldowns)) {
          if (next[k] !== v) {
            next[k] = v;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [gameState?.me?.powerCooldowns]);
  const [invisScope, setInvisScope] = useState("self"); // self | single
  const [invisTargetId, setInvisTargetId] = useState("");
  const [selectedInvisTargets, setSelectedInvisTargets] = useState([]); // sessionIds
  const [exactPosTargetMode, setExactPosTargetMode] = useState("single"); // single | all
  const [selectedExactPosTargets, setSelectedExactPosTargets] = useState([]); // sessionIds
  const [exactPosDuration, setExactPosDuration] = useState(1); // 1 | 5 | 15 | 30
  const [noiseTargetMode, setNoiseTargetMode] = useState("single"); // single | all
  const [selectedNoiseTargets, setSelectedNoiseTargets] = useState([]); // sessionIds
  const [noiseDuration, setNoiseDuration] = useState(30); // 10 | 30 | 60
  const [noiseVolume, setNoiseVolume] = useState("medium"); // low | medium | high
  const [freezeTargetMode, setFreezeTargetMode] = useState("single"); // single | all
  const [selectedFreezeTargets, setSelectedFreezeTargets] = useState([]); // cat sessionIds
  const [freezeDuration, setFreezeDuration] = useState(20);
  const [invisDurationSec, setInvisDurationSec] = useState(300); // 60-900
  const [baliseLureSelecting, setBaliseLureSelecting] = useState(false);
  const [baliseLureTarget, setBaliseLureTarget] = useState(null);
  const [ghostUiNow, setGhostUiNow] = useState(() => Date.now());
  const [joinRequestEffect, setJoinRequestEffect] = useState(null);
  const lastPingRef = useRef(Date.now());
  const serverTimeOffsetRef = useRef(0); // Offset between server time and local time
  
  // Helper function to get synchronized server time
  const getServerTime = () => Date.now() + serverTimeOffsetRef.current;

  // Handle power shortcuts from PlayerSheet
  const handlePowerShortcut = ({ type, target, defaultSettings }) => {
    if (defaultSettings) {
      // Use power with default medium settings
      switch (type) {
        case 'invis':
          socket?.emit(
            "use_power",
            { kind: "invisibility", scope: "multi", targetSessionIds: [target], durationSec: 300 },
            (res) => {
              if (res?.ok) {
                setCd("invisibility", 120);
                addNotification("Invisibilité activée (5 min)", "success");
                setSelectedPlayer(null);
              } else {
                addNotification(res?.error || "Erreur", "error");
              }
            }
          );
          break;
        case 'noise':
          socket?.emit(
            "use_power",
            { kind: "noise", targetSessionIds: [target], durationSec: 30, volume: "medium" },
            (res) => {
              if (res?.ok) {
                setCd("noise", 60);
                addNotification("Bruit fantôme activé (30s)", "success");
                setSelectedPlayer(null);
              } else {
                addNotification(res?.error || "Erreur", "error");
              }
            }
          );
          break;
        case 'freeze':
          socket?.emit(
            "use_power",
            { kind: "freeze_cats", scope: "single", targetSessionId: target, durationSec: 20 },
            (res) => {
              if (res?.ok) {
                setCd("freeze_cats", 90);
                addNotification("Joueur immobilisé (20s)", "success");
                setSelectedPlayer(null);
              } else {
                addNotification(res?.error || "Erreur", "error");
              }
            }
          );
          break;
      }
    } else {
      // Navigate to powers page with pre-selected target
      setSelectedPlayer(null);
      setGameTab("powers");
      
      // Pre-select the target based on power type
      switch (type) {
        case 'invis':
          setSelectedInvisTargets([target]);
          setInvisDurationSec(300); // 5 min default
          break;
        case 'noise':
          setSelectedNoiseTargets([target]);
          setNoiseTargetMode("single");
          setNoiseDuration(30); // 30s default
          setNoiseVolume("medium");
          break;
        case 'freeze':
          setSelectedFreezeTargets([target]);
          setFreezeTargetMode("single");
          setFreezeDuration(20); // 20s default
          break;
      }
    }
  };
  
  const socketRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  sessionIdRef.current = sessionId;
  isHostRef.current = isHost;

  // Tick pour les overlays liés au bruit (timer barre de progression)
  useEffect(() => {
    if (!activeNoise) return;
    const id = setInterval(() => {
      setNoiseUiNow(getServerTime());
      const elapsed = getServerTime() - activeNoise.startedAt;
      if (elapsed > activeNoise.durationSec * 1000) {
        setActiveNoise(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [activeNoise]);

  useEffect(() => {
    setShowShareParty(false);
    setEntryBusyKind(null);
    // Check for rejoin candidate when entering entry screen
    if (stage === "entry") {
      const lastRoom = loadLastRoom();
      const lastNick = loadLastNickname();
      const lastSessionId = localStorage.getItem("chase_gps_last_session");
      if (lastRoom && lastSessionId && lastNick) {
        setRejoinCandidate({ roomCode: lastRoom, sessionId: lastSessionId, nickname: lastNick });
      }
    } else {
      setRejoinCandidate(null);
    }
  }, [stage, resumeCandidate]);

  useEffect(() => {
    if (!isReconnecting) return;
    const id = setInterval(() => setReconnectUiNow(getServerTime()), 250);
    return () => clearInterval(id);
  }, [isReconnecting]);

  // Tick pour les barres de temps (ghost)
  useEffect(() => {
    const id = setInterval(() => setGhostUiNow(getServerTime()), 500);
    return () => clearInterval(id);
  }, []);

  // Clean up invisibility notification when it expires
  useEffect(() => {
    if (!invisNotification) return;
    const elapsed = getServerTime() - invisNotification.startedAt;
    const durationMs = invisNotification.durationSec * 1000;
    if (elapsed > durationMs) {
      setInvisNotification(null);
    }
  }, [invisNotification, ghostUiNow]);

  // Global audio unlock on user interaction (required for iOS)
  useEffect(() => {
    const unlockAudio = () => {
      if (sharedAudioContextRef.current && sharedAudioContextRef.current.state === 'suspended') {
        sharedAudioContextRef.current.resume();
        logger.log('[Global unlock] AudioContext resumed');
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (MAPBOX_STYLES[mapBasemap]) setMapStyleId(mapBasemap);
  }, [mapBasemap]);

  /** Mapbox wins when a token exists. Leaflet OSM fallback otherwise (no Carto watermark). */
  useEffect(() => {
    const applyBasemapForTheme = () => {
      if (stage !== "game") return;
      if (hasMapboxToken()) {
        setMapBasemap(getMapStyleId(theme === "dark" ? "dark" : "light"));
        return;
      }
      if (getOsmApiKey()) {
        setMapBasemap(theme === "dark" ? "dark" : "light");
      } else {
        setMapBasemap((current) =>
          current === "light" || current === "dark" || MAPBOX_STYLES[current] ? "osm" : current
        );
      }
    };
    applyBasemapForTheme();
    window.addEventListener("chase-gps-osm-key", applyBasemapForTheme);
    window.addEventListener(MAPBOX_TOKEN_EVENT, applyBasemapForTheme);
    window.addEventListener(MAP_PREF_EVENTS.style, applyBasemapForTheme);
    return () => {
      window.removeEventListener("chase-gps-osm-key", applyBasemapForTheme);
      window.removeEventListener(MAPBOX_TOKEN_EVENT, applyBasemapForTheme);
      window.removeEventListener(MAP_PREF_EVENTS.style, applyBasemapForTheme);
    };
  }, [theme, stage]);

  const geoEnabled =
    stage === "lobby" || stage === "role_reveal" || stage === "game";

  // Determine whether the player is currently outside the effective global zone
  // so we can ask the geolocation hook to be more aggressive when outside.
  const me = gameState?.me;
  const gc = gameState?.effectiveGlobalCenter || gameState?.gameCenter;
  const gr =
    gameState?.effectiveGlobalRadiusM ??
    gameState?.settings?.globalRadiusM;
  let isOutside = false;
  if (me?.lat != null && me?.lng != null && gc && Number.isFinite(gr)) {
    // quick haversine (reuse helper if available)
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(gc.lat - me.lat);
    const dLon = toRad(gc.lng - me.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(me.lat)) * Math.cos(toRad(gc.lat)) * Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    isOutside = dist > gr;
  }

  const { position, error: geoError } = useGeolocation(geoEnabled, { forceUpdate: isOutside });
  const lastEmit = useRef(0);

  const resetToEntry = useCallback((clearStorage = true) => {
    logger.log('[resetToEntry] Called with:', { clearStorage });
    if (clearStorage) {
      clearSession();
    }
    // Clear URL code parameter
    if (window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    setStage("entry");
    setLobby(null);
    setRolesReveal(null);
    setGameState(null);
    setRole(null);
    setSessionId(null);
    setIsHost(false);
    setGameTab("map");
    setMapBasemap("osm");
    setRecenterTick(0);
    setSummary(null);
    setIsReconnecting(false);
    setReconnectAttempt(0);
    setReconnectError(null);
    setReconnectReason(null);
    setMidJoinWait(null);
    setJoinRequestQueue([]);
    setPartyChatMessages([]);
    setShowShareParty(false);
    setResumeCandidate(null);
    setEntryBusyKind(null);
    setFocusCenter(null);
    setFocusTick(0);
    setErrorBanner(null);
    setNicknameError(null);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    logger.log('[resetToEntry] Reset complete');
  }, []);

  // Reconnection logic - ensures socket is connected then restores session with perfect fallback
  const attemptReconnect = useCallback((s, attempt = 1, useBackup = false) => {
    let saved = useBackup ? loadSessionBackup() : loadSession();
    
    // If main session failed and we haven't tried backup yet, try it
    if (!saved && !useBackup) {
      logger.log('[attemptReconnect] Main session not found, trying backup');
      saved = loadSessionBackup();
      if (saved) {
        // Retry with backup immediately
        attemptReconnect(s, attempt, true);
        return;
      }
    }
    
    if (!saved) {
      logger.log('[attemptReconnect] No session found, giving up');
      setIsReconnecting(false);
      setReconnectReason(null);
      return;
    }

    const tryRestore = () => {
      setReconnectAttempt(attempt);
      setReconnectError(null);
      
      // Add timeout for the reconnection attempt
      const timeoutId = setTimeout(() => {
        logger.log('[attemptReconnect] Reconnection timeout, retrying...');
        setReconnectError("Délai d'attente dépassé");
        
        // Retry with exponential backoff: 2s, 4s, 8s, 16s, max 30s
        const backoffDelay = Math.min(30000, Math.pow(2, attempt) * 1000);
        logger.log(`[attemptReconnect] Retrying in ${backoffDelay}ms (attempt ${attempt})`);
        
        reconnectRetryRef.current = setTimeout(() => {
          attemptReconnect(s, attempt + 1, useBackup);
        }, backoffDelay);
      }, 10000); // 10 second timeout for each attempt

      s.emit(
        "reconnect_session",
        { sessionId: saved.sessionId, roomCode: saved.roomCode },
        (res) => {
          clearTimeout(timeoutId); // Clear timeout on response
          
          if (res?.ok) {
            logger.log('[attemptReconnect] Reconnection successful');
            if (reconnectRetryRef.current) {
              clearTimeout(reconnectRetryRef.current);
              reconnectRetryRef.current = null;
            }
            setIsReconnecting(false);
            setReconnectAttempt(0);
            setReconnectError(null);
            setReconnectReason(null);
            setResumeCandidate(null);
            setSessionId(res.sessionId);
            setIsHost(res.isHost);

            // Restore the session with the correct keys
            saveSession(res.sessionId, saved.roomCode, saved.nickname);

            if (res.phase === "lobby" && res.lobby) {
              setLobby(res.lobby);
              if (res.lobby.partyChat) setPartyChatMessages(res.lobby.partyChat);
              setStage("lobby");
            } else if (res.phase === "role_reveal" && res.rolesReveal) {
              setRolesReveal(res.rolesReveal);
              if (res.rolesReveal.partyChat) setPartyChatMessages(res.rolesReveal.partyChat);
              setHasSeenRole(false);
              setStage("role_reveal");
            } else if (res.phase === "playing" && res.gameState) {
              setGameState(res.gameState);
              if (res.gameState.partyChat) setPartyChatMessages(res.gameState.partyChat);
              setRole(res.gameState.me?.role ?? null);
              setStage("game");
            } else if (res.phase === "finished") {
              clearSession();
              resetToEntry(false);
            }
            return;
          }

          logger.log('[attemptReconnect] Reconnection failed:', res?.error);
          setReconnectError(res?.error || "Échec de reconnexion");

          // Check if error is permanent (session expired/terminated)
          const isPermanentError =
            res?.error?.includes("expir") ||
            res?.error?.includes("n'existe plus") ||
            res?.error?.includes("n'existe") ||
            res?.error?.includes("termin") ||
            res?.error?.includes("invalide") ||
            res?.error?.includes("not found");

          if (isPermanentError) {
            logger.log('[attemptReconnect] Permanent error, clearing session');
            clearSession();
            clearAllSessions(); // Clear both main and backup
            setIsReconnecting(false);
            setReconnectReason(null);
            resetToEntry(false);
            return;
          }

          // If we haven't tried backup yet and this is the first attempt, try backup
          if (!useBackup && attempt === 1) {
            logger.log('[attemptReconnect] Trying backup session');
            attemptReconnect(s, attempt + 1, true);
            return;
          }

          // Retry with exponential backoff
          const backoffDelay = Math.min(30000, Math.pow(2, attempt) * 1000);
          logger.log(`[attemptReconnect] Retrying in ${backoffDelay}ms (attempt ${attempt})`);
          
          reconnectRetryRef.current = setTimeout(() => {
            attemptReconnect(s, attempt + 1, useBackup);
          }, backoffDelay);
        }
      );
    };

    // Ensure socket is connected before attempting restore
    if (!s?.connected) {
      logger.log('[attemptReconnect] Socket not connected, waiting...');
      setIsReconnecting(true);
      setReconnectReason("lost_connection");
      
      ensureSocketReady(s)
        .then(() => {
          logger.log('[attemptReconnect] Socket ready, attempting restore');
          tryRestore();
        })
        .catch((err) => {
          logger.log('[attemptReconnect] Socket ready failed:', err);
          setReconnectError("Impossible de connecter au serveur");
          
          // Retry with exponential backoff
          const backoffDelay = Math.min(30000, Math.pow(2, attempt) * 1000);
          reconnectRetryRef.current = setTimeout(() => {
            attemptReconnect(s, attempt + 1, useBackup);
          }, backoffDelay);
        });
      return;
    }

    logger.log('[attemptReconnect] Socket connected, attempting restore');
    tryRestore();
  }, [resetToEntry]);

  // Auto-switch to join mode if URL has code
  useEffect(() => {
    const urlCode = getCodeFromUrl();
    if (urlCode) {
      setEntryMode("join");
      setRoomCodeInput(urlCode);
      const saved = loadSession();
      if (saved?.roomCode?.toUpperCase() === urlCode.toUpperCase()) {
        // If we have an active session for this room, show the resume choice
        // DO NOT auto-reconnect here, let the connect handler or user handle it
        setResumeCandidate(saved);
        return;
      }
      const lastNick = loadLastNickname();
      if (lastNick.trim()) {
        setNickname(lastNick);
        // Do not auto-join anymore, wait for user to click
      }
    }
  }, [socket, connected]);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: false,
      reconnectionAttempts: 0,
      reconnectionDelay: 0,
      reconnectionDelayMax: 0,
    });
    setSocket(s);
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      lastPingRef.current = getServerTime();
      let saved = loadSession();
      if (!saved) {
        // Try backup keys if main keys not found
        saved = loadSessionBackup();
      }
      if (saved) {
        setIsReconnecting(true);
        setReconnectReason("lost_connection");
        setReconnectError(null);
        attemptReconnect(s);
      }
    });

    s.on("disconnect", () => {
      setConnected(false);
      if (stageRef.current === "entry") {
        // On home screen, clear main session but keep backup for crash recovery
        clearSession();
        setRejoinCandidate(null);
        // Don't clear backup keys - they're for crash recovery
      } else if (stageRef.current === "lobby" || stageRef.current === "role_reveal" || stageRef.current === "game") {
        setIsReconnecting(true);
        setReconnectReason("lost_connection");
        setReconnectError(null);
        attemptReconnect(s);
      }
    });

    s.on("server_ping", ({ t }) => {
      lastPingRef.current = getServerTime();
      // Calculate time offset: server time - client time
      // This allows us to synchronize timers across all devices
      serverTimeOffsetRef.current = t - Date.now();
      syncServerTime(t);
      s.emit("client_pong", { t });
    });

    s.on("lobby_update", (payload) => {
      if (stageRef.current === "entry") return;
      setIsReconnecting(false);
      setReconnectReason(null);
      setLobby(payload);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
      if (payload.phase === "lobby") setStage("lobby");
    });

    s.on("roles_reveal", (payload) => {
      if (stageRef.current === "entry") return;
      setIsReconnecting(false);
      setReconnectReason(null);
      logger.log('[Client] roles_reveal payload received:', payload);
      logger.log('[Client] Players with location:', payload.players?.filter(p => p.lat != null && p.lng != null).length, '/', payload.players?.length);
      setRolesReveal(payload);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
      setHasSeenRole(false);
      // Don't reset isFlipped - let user control when to flip
      setStage("role_reveal");
    });

    s.on("game_state", (payload) => {
      if (stageRef.current === "entry") return;
      setIsReconnecting(false);
      setReconnectReason(null);
      setGameState(payload);
      setRole(payload.me?.role ?? null);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
      if (payload.phase === "playing") setStage("game");
      
      // Restore activeNoise from backend if noise effect is still valid
      if (payload.me?.noiseEffect) {
        const noiseEffect = payload.me.noiseEffect;
        const now = getServerTime();
        const elapsed = now - noiseEffect.startedAt;
        if (elapsed <= noiseEffect.durationSec * 1000) {
          setActiveNoise({
            startedAt: noiseEffect.startedAt,
            durationSec: noiseEffect.durationSec,
            volume: noiseEffect.volume,
            by: noiseEffect.by
          });
          setNoiseUiNow(now);
        }
      }
      
      // Restore invisibility notification if invisibility is active
      if (payload.me?.invisUntil && payload.me.invisSince) {
        const now = getServerTime();
        if (now < payload.me.invisUntil) {
          const durationSec = Math.round((payload.me.invisUntil - payload.me.invisSince) / 1000);
          // Check if I used the power on myself
          if (payload.me.invisUsedBy === sessionIdRef.current) {
            setInvisNotification({
              scope: "self",
              targetNames: null,
              durationSec,
              startedAt: payload.me.invisSince
            });
          }
        }
      }
    });

    s.on("game_finished", (data) => {
      clearSession();
      setSummary(data);
      setGameState(null);
      
      // Redirect to recap page with game code
      const recapUrl = `/recap/${data.code}`;
      window.history.pushState({}, "", recapUrl);
      setRecapSlug(data.code);
      setRecapData(data);
      setRecapLoading(false);
      setRecapErr(false);
      setStage("recap");
    });

    s.on("capture_ok", (data) => {
      haptic(15);
      addNotification(`${data.preyNickname} a été attrapé !`, "success");
      if (data?.preySessionId && data.preySessionId === sessionIdRef.current) {
        setShowScan(false);
        // Only show QR automatically if we are still a player (e.g. to be rescued)
        setGameState((current) => {
          if (current?.me?.role !== "cat") {
            setShowQr(true);
          }
          return current;
        });
      }
    });

    s.on("capture_cooldown", (data) => {
      if (data.sessionId === sessionIdRef.current) {
        // Set capture cooldown for the player
        setCaptureCooldownUntil(Date.now() + data.cooldownSeconds * 1000);
        addNotification(`Délai d'attente de ${data.cooldownSeconds}s avant de pouvoir capturer (2 joueurs)`, "info", data.cooldownSeconds * 1000);
      }
    });

    s.on("revenge_cooldown", (data) => {
      if (data.hunterSessionId === sessionIdRef.current) {
        addNotification(`Anti-revanche : attendez ${data.cooldownSeconds}s avant de capturer ce joueur`, "warning", data.cooldownSeconds * 1000);
      }
    });

    s.on("balise_capture_blocked", (data) => {
      if (data.sessionId === sessionIdRef.current) {
        const notif = {
          kind: 'balise_blocked',
          message: data.message,
          startedAt: Date.now(),
          durationMs: 2000,
        };
        setBaliseBlockedNotification(notif);
        if (baliseBlockedTimeoutRef.current) clearTimeout(baliseBlockedTimeoutRef.current);
        baliseBlockedTimeoutRef.current = setTimeout(() => {
          setBaliseBlockedNotification(null);
          baliseBlockedTimeoutRef.current = null;
        }, 2000);
      }
    });

    s.on("player_out_of_bounds", (data) => {
      if (data.sessionId === sessionIdRef.current) {
        setIsOutOfBounds(true);
        addNotification(`Vous êtes sorti de la zone de jeu!`, "error", 5000);
        
        // Vibration - stronger pattern for mobile
        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 300]);
        }
        
        try {
          // Use shared AudioContext or create new one
          let audioCtx = sharedAudioContextRef.current;
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            sharedAudioContextRef.current = audioCtx;
          }

          // Resume if suspended (required for iOS)
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }

          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "square";
          osc.frequency.value = 400;

          // Pulsing sound pattern for better awareness
          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          const now = audioCtx.currentTime;
          for (let i = 0; i < 100; i++) { // Pulse for about 10 seconds
            const t = now + i * 0.1;
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          }

          osc.start();
          outOfBoundsAudioRef.current = { audioCtx, osc, gain };

          logger.log('[player_out_of_bounds] Pulsing sound playing, AudioContext state:', audioCtx.state);
        } catch (e) {
          logger.warn("AudioContext non disponible ou bloque", e);
        }
      } else {
        addNotification(`${data.nickname} est sorti de la zone!`, "warning", 4000);
      }
    });

    s.on("player_reentered_zone", (data) => {
      if (data.sessionId === sessionIdRef.current) {
        setIsOutOfBounds(false);
        if (outOfBoundsAudioRef.current) {
          try {
            const { audioCtx, osc, gain } = outOfBoundsAudioRef.current;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.stop(audioCtx.currentTime + 0.3);
          } catch (e) {
            logger.warn("Error stopping audio", e);
          }
          outOfBoundsAudioRef.current = null;
        }
        addNotification(`Vous êtes revenu dans la zone de jeu!`, "success", 3000);
      } else {
        addNotification(`${data.nickname} est revenu dans la zone!`, "info", 3000);
      }
    });

    s.on("kicked", () => {
      clearSession();
      setIsReconnecting(true);
      setReconnectReason("kicked");
    });

    s.on("play_noise", ({ durationSec, volume = "medium", by }) => {
      playGhostNoiseSound(sharedAudioContextRef, noiseAudioRef, durationSec, volume).catch((e) => {
        logger.warn("AudioContext non disponible pour bruit", e);
      });

      setActiveNoise({
        startedAt: getServerTime(),
        durationSec: Math.max(1, durationSec || 1),
        volume,
        by: by || "un adversaire",
      });
    });

    s.on("game_notification", ({ kind, ...data }) => {
      if (kind === "noise") {
        // Noise notification is already handled by play_noise event and activeNoise state
        // No additional action needed
      } else if (kind === "invisibility") {
        // Store invisibility notification for HUD display
        setInvisNotification({
          scope: data.scope,
          targetNames: data.targetNames,
          durationSec: data.durationSec,
          startedAt: getServerTime()
        });
        // Also show toast notification
      }
    });

    s.on("immobilized", ({ until, by, durationSec }) => {
      // L'overlay d'immobilisation est déjà géré côté UI via me.immobilizedUntil ;
      // pas de notification toast supplémentaire ici pour garder un impact visuel fort.
    });

    s.on("admin_role_changed", (data) => {
      addNotification(`Role mis a jour : ${data.nickname} -> ${data.role}`, "info");
    });

    s.on("player_left", (data) => {
      // Removed notification - connection events no longer shown
    });

    s.on("player_joined", (data) => {
      // Removed notification - connection events no longer shown
    });

    s.on("player_disconnected", (data) => {
      // Removed notification - connection events no longer shown
    });

    s.on("player_reconnected", (data) => {
      // Removed notification - connection events no longer shown
    });

    s.on("party_chat", (m) => {
      setPartyChatMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m].slice(-120);
      });
      if (m.sessionId && m.sessionId !== sessionIdRef.current) {
        const preview =
          m.type === "image"
            ? "a partagé une photo"
            : m.type === "location"
              ? "a partagé sa position"
              : m.text
                ? String(m.text).slice(0, 72) + (String(m.text).length > 72 ? "…" : "")
                : "nouveau message";
        addNotification(`Discussion · ${m.nickname} : ${preview}`, "info", 4500);
      }
    });

    s.on("join_request_pending", (data) => {
      setJoinRequestQueue((q) => [
        ...q,
        {
          requestId: data.requestId,
          nickname: data.nickname,
          code: data.code,
        },
      ]);
      // Use new game notification modal instead of old notification
      setJoinRequestEffect({
        kind: "join_request",
        requestId: data.requestId,
        nickname: data.nickname,
        onAccept: () => respondJoinRequest(data.requestId, true),
        onDeny: () => respondJoinRequest(data.requestId, false),
      });
    });

    s.on("join_request_denied", (data) => {
      setMidJoinWait(null);
      addNotification(data?.message || "Demande refusée par l'hôte.", "warning");
    });

    s.on("join_request_accepted", (payload) => {
      const nick = lastNicknameRef.current || nickname.trim() || "Joueur";
      // Save session immediately to localStorage (even if connection fails later)
      saveSession(payload.sessionId, payload.code, nick);
      setSessionId(payload.sessionId);
      setIsHost(Boolean(payload.isHost));
      setMidJoinWait(null);
      if (payload.lobby) setLobby(payload.lobby);
      if (payload.rolesReveal) setRolesReveal(payload.rolesReveal);
      if (payload.gameState) {
        setGameState(payload.gameState);
        setRole(payload.gameState.me?.role ?? null);
      }
      if (payload.gameState?.partyChat) setPartyChatMessages(payload.gameState.partyChat);
      else if (payload.rolesReveal?.partyChat) setPartyChatMessages(payload.rolesReveal.partyChat);
      else if (payload.lobby?.partyChat) setPartyChatMessages(payload.lobby.partyChat);
      if (payload.phase === "role_reveal") {
        setHasSeenRole(false);
        // Don't reset isFlipped - let user control when to flip
        setStage("role_reveal");
      } else if (payload.phase === "playing") {
        setStage("game");
      } else {
        setStage("lobby");
      }
      s.emit("refresh_state");
    });

    s.on("room_destroyed", () => {
      clearSession();
      addNotification(
        "La salle a été fermée (plus personne ou partie supprimée).",
        "error"
      );
      resetToEntry();
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await ensureSocketReady(s, { wake: true });
      } catch {
        /* retry on next visibility */
      }
      if (s.connected) {
        s.emit("refresh_state");
      } else if (
        stageRef.current === "lobby" ||
        stageRef.current === "role_reveal" ||
        stageRef.current === "game"
      ) {
        setIsReconnecting(true);
        setReconnectReason("lost_connection");
        attemptReconnect(s);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const heartbeatCheck = setInterval(() => {
      if (s.connected && getServerTime() - lastPingRef.current > 180000) {
        s.emit("refresh_state");
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(heartbeatCheck);
      if (reconnectRetryRef.current) {
        clearTimeout(reconnectRetryRef.current);
        reconnectRetryRef.current = null;
      }
      s.removeAllListeners();
      s.close();
    };
  }, [resetToEntry, attemptReconnect, addNotification]);

  useEffect(() => {
    if (gameTab === "admin") setGameTab("settings");
  }, [gameTab]);

  useEffect(() => {
    if (gameTab === "party") setGameTab("map");
  }, [gameTab]);

  // Close all modals when switching tabs on mobile to prevent overlapping
  useEffect(() => {
    setShowQr(false);
    setShowScan(false);
    setShowShareParty(false);
    setSelectedPlayer(null);
  }, [gameTab]);

  useEffect(() => {
    if (!socket || !position) {
      logger.log('[Position emit] Skipped:', { hasSocket: !!socket, hasPosition: !!position });
      return;
    }
    const now = getServerTime();
    if (now - lastEmit.current < 800) {
      logger.log('[Position emit] Rate limited');
      return;
    }
    lastEmit.current = now;
    logger.log('[Position emit] Sending position:', { lat: position.lat, lng: position.lng });
    socket.emit("position", { lat: position.lat, lng: position.lng });
  }, [socket, position]);

  // Check periodically for players without location and remind them
  useEffect(() => {
    if (stage !== "role_reveal" || !rolesReveal?.players) return;

    const checkLocation = () => {
      const playersWithoutLocation = rolesReveal.players.filter(p =>
        p.sessionId !== sessionId && (p.lat == null || p.lng == null)
      );

      if (playersWithoutLocation.length > 0) {
        logger.log('[Location check] Players without location:', playersWithoutLocation.map(p => p.nickname));
        // Show notification to remind players to enable location
        addNotification(
          `${playersWithoutLocation.length} joueur(s) doivent activer leur localisation`,
          "warning"
        );
      }
    };

    // Check immediately
    checkLocation();

    // Check every 10 seconds
    const interval = setInterval(checkLocation, 10000);

    return () => clearInterval(interval);
  }, [stage, rolesReveal?.players, sessionId, addNotification]);

  const settings = lobby?.settings ||
    rolesReveal?.settings || {
      globalRadiusM: 500,
      jamRadiusM: 80,
      catCount: 1,
      catDelayMinutes: 5,
      shrinkZoneEnabled: false,
      shrinkDurationMinutes: 15,
      shrinkMinRadiusM: 100,
      shrinkPhases: 5,
      timeLimitEnabled: false,
      timeLimitMinutes: 30,
      catAssignmentMode: "random",
      gameMode: "tag_swap",
      hostCatMapPreview: false,
    };

  const unlockAudioAndVibration = useCallback(() => {
    logger.log('[unlockAudioAndVibration] Called');
    try {
      // Create or reuse shared AudioContext
      if (!sharedAudioContextRef.current) {
        sharedAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = sharedAudioContextRef.current;
      
      // Resume if suspended (required for iOS)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      // Play a silent sound to unlock audio
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.value = 0; // silent
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
      logger.log('[unlockAudioAndVibration] Audio unlocked, state:', audioCtx.state);
    } catch(e) {
      logger.log('[unlockAudioAndVibration] Audio unlock failed:', e);
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(1); } catch(e) {}
      logger.log('[unlockAudioAndVibration] Vibration unlocked');
    }
  }, []);

  const onCreate = useCallback(async () => {
    if (!socket || !nickname.trim()) {
      setNicknameError("Choisissez un pseudo.");
      return;
    }
    unlockAudioAndVibration();
    setErrorBanner(null);
    const reqId = ++entryReqRef.current;
    setEntryBusyKind("create");
    const trimmedNickname = nickname.trim();
    saveLastNickname(trimmedNickname);
    try {
      await ensureSocketReady(socket);
    } catch {
      if (reqId !== entryReqRef.current) return;
      setEntryBusyKind(null);
      setErrorBanner("Serveur injoignable. Réessayez dans quelques secondes.");
      return;
    }
    socket.emit("create_room", { nickname: trimmedNickname }, (res) => {
      if (reqId !== entryReqRef.current) return;
      setEntryBusyKind(null);
      if (!res?.ok) {
        setErrorBanner(res?.error || "Impossible de creer la salle.");
        return;
      }
      // Save session immediately to localStorage (even if connection fails later)
      saveSession(res.sessionId, res.code, trimmedNickname);
      if (window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      setSessionId(res.sessionId);
      setIsHost(true);
      setLobby(res.lobby);
      setStage("lobby");
    });
  }, [socket, nickname]);

  const respondJoinRequest = useCallback(
    (requestId, accept) => {
      logger.log('[respondJoinRequest] Called with:', { requestId, accept });
      if (!socket) {
        logger.log('[respondJoinRequest] No socket');
        return;
      }
      socket.emit("respond_join_request", { requestId, accept }, (res) => {
        logger.log('[respondJoinRequest] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Action impossible.");
        setJoinRequestQueue((q) => q.filter((x) => x.requestId !== requestId));
        setJoinRequestEffect(null);
      });
    },
    [socket]
  );

  const onJoin = useCallback(async () => {
    if (!socket || !nickname.trim() || !roomCodeInput.trim()) {
      if (!nickname.trim()) setNicknameError("Choisissez un pseudo.");
      else setErrorBanner("Code de partie requis.");
      return;
    }
    unlockAudioAndVibration();
    setErrorBanner(null);
    setNicknameError(null);
    const trimmedNickname = nickname.trim();
    lastNicknameRef.current = trimmedNickname;
    saveLastNickname(trimmedNickname);
    const reqId = ++entryReqRef.current;
    setEntryBusyKind("join");
    const codeUpper = roomCodeInput.trim().toUpperCase();
    const saved = loadSession();
    const lastRoom = loadLastRoom();
    const lastSessionId = (() => { try { return localStorage.getItem(LS_LAST_SESSION_KEY) || null; } catch { return null; } })();
    const payload = { code: codeUpper, nickname: trimmedNickname };
    if (saved?.roomCode?.toUpperCase() === codeUpper && saved.sessionId) {
      payload.sessionId = saved.sessionId;
    } else if (lastRoom && lastSessionId && lastRoom.toUpperCase() === codeUpper) {
      payload.sessionId = lastSessionId;
    }
    try {
      await ensureSocketReady(socket);
    } catch {
      if (reqId !== entryReqRef.current) return;
      setEntryBusyKind(null);
      setErrorBanner("Serveur injoignable. Réessayez dans quelques secondes.");
      return;
    }
    socket.emit(
      "join_room",
      payload,
      (res) => {
        if (reqId !== entryReqRef.current) return;
        setEntryBusyKind(null);
        if (res?.ok) {
          // Save session immediately to localStorage (even if connection fails later)
          saveSession(res.sessionId, res.code, trimmedNickname);
          if (window.history.replaceState) {
            window.history.replaceState({}, "", window.location.pathname);
          }
          setSessionId(res.sessionId);
          setIsHost(res.isHost);
          setLobby(res.lobby);
          setStage("lobby");
          return;
        }
        if (res?.joinRequestPossible) {
          socket.emit(
            "request_join_midgame",
            {
              code: roomCodeInput.trim(),
              nickname: trimmedNickname,
            },
            (r2) => {
              if (r2?.ok) {
                setMidJoinWait({ code: roomCodeInput.trim() });
                setErrorBanner(null);
              } else if (r2?.useNormalJoin) {
                setErrorBanner(r2?.error || "Rejoignez depuis l'écran d'accueil.");
              } else {
                setErrorBanner(r2?.error || "Demande impossible.");
              }
            }
          );
          return;
        }
        if (res?.error?.toLowerCase().includes("pseudo") || res?.error?.toLowerCase().includes("déjà") || res?.error?.toLowerCase().includes("nom")) {
          setNicknameError(res?.error || "Ce pseudo est déjà utilisé.");
        } else {
          setErrorBanner(res?.error || "Impossible de rejoindre.");
        }
      }
    );
  }, [socket, nickname, roomCodeInput, addNotification]);

  // Keep onJoinRef in sync with onJoin
  useEffect(() => {
    onJoinRef.current = onJoin;
  }, [onJoin]);

  const pushSettings = useCallback(
    (partial) => {
      logger.log('[pushSettings] Called with:', partial);
      if (!socket) {
        logger.log('[pushSettings] No socket');
        return;
      }
      socket.emit("update_settings", partial, (res) => {
        logger.log('[pushSettings] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Mise a jour refusee.");
        else if (res.lobby) setLobby(res.lobby);
      });
    },
    [socket]
  );

  const onRevealRoles = useCallback(() => {
    logger.log('[onRevealRoles] Called');
    if (!socket) {
      logger.log('[onRevealRoles] No socket');
      return;
    }
    socket.emit("start_roles", {}, (res) => {
      logger.log('[onRevealRoles] Response:', res);
      // Error is prevented by button being disabled, so no need to show error banner
      if (!res?.ok) logger.error('[onRevealRoles] Error:', res?.error);
    });
  }, [socket]);

  const adminAddTime = useCallback(
    (minutes) => {
      logger.log('[adminAddTime] Called with:', minutes);
      if (!socket) {
        logger.log('[adminAddTime] No socket');
        return;
      }
      const m = Math.max(1, Math.floor(Number(minutes) || 0));
      socket.emit("admin_add_time", { minutes: m }, (res) => {
        logger.log('[adminAddTime] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Ajout de temps refusé.");
        else addNotification(`+${m} min ajoutées à la partie`, "success");
      });
    },
    [socket, addNotification]
  );

  const baliseExpiresAt = useMemo(() => {
    const arr = gameState?.balises || [];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    let min = null;
    for (const b of arr) {
      if (b && typeof b.expiresAt === "number") {
        if (min == null || b.expiresAt < min) min = b.expiresAt;
      }
    }
    return min;
  }, [gameState?.balises]);

  // Roster list derived from game state / rolesReveal and merged with location data.
  // Moved above callbacks that reference it to avoid temporal-dead-zone errors
  // when those callbacks include `rosterList` in their dependency arrays.
  const rosterList = useMemo(() => {
    let baseRoster = [];
    if (gameState?.roster?.length) {
      baseRoster = gameState.roster;
    } else if (rolesReveal?.players?.length) {
      baseRoster = rolesReveal.players.map((p) => ({
        sessionId: p.sessionId,
        nickname: p.nickname,
        role: p.role,
        originalRole: p.originalRole,
        captured: false,
        spectator: false,
      }));
    }

    // Merge with location data from gameState
    const locationMap = new Map();
    // Add allies location data
    for (const a of gameState?.allies || []) {
      if (a.sessionId && a.lat != null && a.lng != null) {
        locationMap.set(a.sessionId, { lat: a.lat, lng: a.lng });
      }
    }
    // Add cats exact location data
    for (const c of gameState?.catsExact || []) {
      if (c.sessionId && c.lat != null && c.lng != null) {
        locationMap.set(c.sessionId, { lat: c.lat, lng: c.lng });
      }
    }
    // Add prey for cat location data (if viewing as cat)
    if (role === "cat") {
      for (const p of gameState?.preyForCat || []) {
        if (p.sessionId && p.kind === "exact" && p.lat != null && p.lng != null) {
          locationMap.set(p.sessionId, { lat: p.lat, lng: p.lng });
        } else if (p.sessionId && p.kind === "circle" && p.center) {
          locationMap.set(p.sessionId, {
            lat: p.center.lat,
            lng: p.center.lng,
            mapKind: "circle",
            radiusM: p.radiusM,
          });
        }
      }
    }
    // Add admin prey preview location data (if host with preview enabled)
    if (isHost) {
      for (const p of gameState?.adminPreyPreview || []) {
        if (p.sessionId && p.kind === "exact" && p.lat != null && p.lng != null) {
          locationMap.set(p.sessionId, { lat: p.lat, lng: p.lng });
        } else if (p.sessionId && p.kind === "circle" && p.center) {
          locationMap.set(p.sessionId, {
            lat: p.center.lat,
            lng: p.center.lng,
            mapKind: "circle",
            radiusM: p.radiusM,
          });
        }
      }
    }
    // Spectateurs avec position
    for (const s of gameState?.spectators || []) {
      if (s.sessionId && s.lat != null && s.lng != null) {
        locationMap.set(s.sessionId, { lat: s.lat, lng: s.lng });
      }
    }
    // Position du joueur courant (gameState.me)
    if (sessionId && gameState?.me?.lat != null && gameState?.me?.lng != null) {
      locationMap.set(sessionId, { lat: gameState.me.lat, lng: gameState.me.lng });
    }

    // Merge location data into roster
    return baseRoster.map((player) => {
      const loc = locationMap.get(player.sessionId);
      // Get coins from gameState.me if it's the current player, otherwise try to get from allies/cats
      let coins = player.coins;
      if (player.sessionId === sessionId && gameState?.me?.coins !== undefined) {
        coins = gameState.me.coins;
      }
      return {
        ...player,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        coins,
      };
    });
  }, [gameState?.roster, gameState?.allies, gameState?.catsExact, gameState?.preyForCat, gameState?.adminPreyPreview, gameState?.spectators, gameState?.me, rolesReveal?.players, role, isHost, sessionId]);

  const onBeginHunt = useCallback(() => {
    logger.log('[onBeginHunt] Called');
    if (!socket) {
      logger.log('[onBeginHunt] No socket');
      return;
    }
    if (geoError) {
      logger.log('[onBeginHunt] Geolocation error:', geoError);
      // Don't show notification - button should be disabled with message
      return;
    }
    if (!position) {
      logger.log('[onBeginHunt] No position available');
      // Don't show notification - button should be disabled with message
      return;
    }

    socket.emit("begin_hunt", {}, (res) => {
      logger.log('[onBeginHunt] Response:', res);
      // Error is prevented by button being disabled, so no need to show error banner
      if (!res?.ok) logger.error('[onBeginHunt] Error:', res?.error);
    });
  }, [socket, geoError, position]);

  const openScanner = useCallback(() => {
    if (showScanRef.current) return;
    showScanRef.current = true;
    setErrorBanner(null);
    setShowScan(true);
  }, []);

  const onScanResult = useCallback(
    (text) => {
      logger.log('[onScanResult] Called with:', { text });
      if (!socket || !text) {
        logger.log('[onScanResult] No socket or text');
        return;
      }
      const id = String(text).trim();
      socket.emit("capture_scan", { targetSessionId: id }, (res) => {
        logger.log('[onScanResult] Response:', res);
        if (!res?.ok) {
          // Only show error for legitimate failures, not for preventable ones
          logger.error('[onScanResult] Error:', res?.error);
        } else {
          setShowScan(false);
        }
      });
    },
    [socket]
  );

  const adminKick = useCallback(
    (targetSessionId) => {
      logger.log('[adminKick] Called with:', { targetSessionId });
      if (!socket) {
        logger.log('[adminKick] No socket');
        return;
      }
      socket.emit("admin_kick", { targetSessionId }, (res) => {
        logger.log('[adminKick] Response:', res);
        if (!res?.ok) {
          logger.error('[adminKick] Error:', res?.error);
        }
      });
    },
    [socket]
  );

  const adminSetRole = useCallback(
    (targetSessionId, r) => {
      logger.log('[adminSetRole] Called with:', { targetSessionId, role: r });
      if (!socket) {
        logger.log('[adminSetRole] No socket');
        return;
      }
      socket.emit("admin_set_role", { targetSessionId, role: r }, (res) => {
        logger.log('[adminSetRole] Response:', res);
        if (!res?.ok) {
          logger.error('[adminSetRole] Error:', res?.error);
        }
      });
    },
    [socket]
  );

  const adminEndGame = useCallback(() => {
    logger.log('[adminEndGame] Called');
    if (!socket) {
      logger.log('[adminEndGame] No socket');
      return;
    }
    socket.emit("admin_end_game", {}, (res) => {
      logger.log('[adminEndGame] Response:', res);
      if (!res?.ok) {
        logger.error('[adminEndGame] Error:', res?.error);
      } else {
        setGameTab("map");
      }
    });
  }, [socket]);

  const leaveGame = useCallback(() => {
    // Save session info for potential rejoin choice later
    const saved = loadSession();
    if (saved) {
      try {
        localStorage.setItem(LS_LAST_NICKNAME_KEY, saved.nickname);
        localStorage.setItem(LS_LAST_ROOM_KEY, saved.roomCode);
        localStorage.setItem(LS_LAST_SESSION_KEY, saved.sessionId);
      } catch (e) {
        logger.warn("localStorage non disponible:", e);
      }
    }

    // Clear session and reset UI immediately
    clearSession();
    resetToEntry(false);

    if (socket) {
      try {
        socket.emit("leave_room", {}, () => {
          try { socket.disconnect(); } catch {}
        });
        setTimeout(() => {
          if (socket.connected) {
            try { socket.disconnect(); } catch {}
          }
        }, 300);
      } catch {
        try { socket.disconnect(); } catch {}
      }
    }
  }, [socket, resetToEntry]);

  const sendPartyChat = useCallback(
    (msg) => {
      if (!socket) return;
      socket.emit("party_chat_send", msg, (res) => {
        if (!res?.ok) {
          logger.error('[partyChatSend] Error:', res?.error);
        }
      });
    },
    [socket]
  );

  const roleLabel = useMemo(() => {
    if (role === "cat") return "Chat";
    if (role === "player") return "Souris";
    return "";
  }, [role]);

  // Suivi des changements d'invisibilité pour notifications
  const prevInvisStateRef = useRef(new Map());
  useEffect(() => {
    const currentMap = new Map();
    for (const p of rosterList || []) {
      const sessionId = p.sessionId;
      const wasInvisible = prevInvisStateRef.current.get(sessionId) === true;
      const isInvisible = Boolean(p.invisible);
      currentMap.set(sessionId, isInvisible);
      if (wasInvisible !== isInvisible && p.nickname) {
        // Removed ghost mode notifications - they are now shown in the social panel instead
      }
    }
    prevInvisStateRef.current = currentMap;
  }, [rosterList, addNotification]);

  const geoChatItems = useMemo(() => {
    return (partyChatMessages || [])
      .filter((m) => {
        if (m.lat == null || m.lng == null) return false;
        if (m.type === "image") return Boolean(m.image);
        if (m.type === "location") return true;
        return false;
      })
      .map((m) => ({
        id: m.id,
        type: m.type,
        lat: m.lat,
        lng: m.lng,
        image: m.image,
        nickname: m.nickname,
        text: m.text,
      }));
  }, [partyChatMessages]);

  const onFocusChatLocation = useCallback((lat, lng) => {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    setGameTab("map");
    setFocusCenter([la, lo]);
    setFocusZoom(18);
    setFocusTick((n) => n + 1);
  }, []);

  const onShowPlayerOnMap = useCallback(
    (mapFocus, playerSessionId) => {
      if (!mapFocus || mapFocus.type === "unavailable" || mapFocus.type === "hidden") return;
      setGameTab("map");
      setFocusCenter([mapFocus.lat, mapFocus.lng]);
      setFocusZoom(mapFocus.zoom ?? 18);
      setFocusTick((n) => n + 1);
      if (playerSessionId) {
        setHighlightSessionId(playerSessionId);
        setTimeout(() => setHighlightSessionId(null), 8000);
      }
    },
    []
  );

  useEffect(() => {
    if (!rolesReveal?.players || !sessionId) return;
    const me = rolesReveal.players.find((p) => p.sessionId === sessionId);
    if (me) setRole(me.role);
  }, [rolesReveal, sessionId]);

  const currentRoomCode = rolesReveal?.code || lobby?.code || gameState?.code || "";

  useEffect(() => {
    if (!recapSlug) return;
    let alive = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    const fetchRecap = async () => {
      try {
        const data = await getGameByCode(recapSlug);
        if (alive) {
          if (data) {
            // Transform Supabase data to match expected format
            const summary = {
              code: data.code,
              huntStartedAt: data.hunt_started_at ? new Date(data.hunt_started_at).getTime() : null,
              endedAt: data.ended_at ? new Date(data.ended_at).getTime() : null,
              gameCenter: data.game_center,
              globalRadiusM: data.global_radius_m,
              jamRadiusM: data.jam_radius_m,
              settingsSnapshot: data.settings_snapshot,
              players: data.players,
              colors: data.colors,
              partyChat: data.party_chat,
              shrinkPhasesList: data.shrink_phases_list,
              balises: data.balises,
              analytics: data.analytics,
              timeline: data.analytics?.timeline || [],
              paths: data.analytics?.paths || {},
              jamHistory: data.analytics?.jamHistory || [],
            };
            setRecapData(summary);
            setRecapErr(false);
            setRecapLoading(false);
            
            // Update page title for sharing
            document.title = `Chase GPS - Partie ${data.code}`;
          } else {
            // Data not yet saved to Supabase, retry
            retryCount++;
            if (retryCount < maxRetries) {
              logger.log(`[recap] Game data not found, retrying (${retryCount}/${maxRetries})...`);
              setTimeout(fetchRecap, retryDelay);
            } else {
              logger.log('[recap] Max retries reached, showing error');
              setRecapErr(true);
              setRecapLoading(false);
            }
          }
        }
      } catch (e) {
        logger.error('Failed to fetch recap from Supabase:', e);
        if (alive) {
          setRecapErr(true);
          setRecapLoading(false);
        }
      }
    };
    
    fetchRecap();
    
    return () => {
      alive = false;
    };
  }, [recapSlug]);

  const showReconnectModal = isReconnecting;

  const reconnectModal = (
    <ReconnectModal
      isReconnecting={showReconnectModal}
      reconnectAttempt={reconnectAttempt}
      lastError={reconnectError}
      reason={reconnectReason}
      onRetry={() => {
        const s = socketRef.current;
        if (s) attemptReconnect(s);
      }}
      onCancel={() => {
        // Stop reconnection attempts
        if (reconnectRetryRef.current) {
          clearTimeout(reconnectRetryRef.current);
          reconnectRetryRef.current = null;
        }
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setReconnectError(null);
        setReconnectReason(null);

        if (reconnectReason === "kicked") {
          resetToEntry();
        } else {
          // Clear ALL sessions (main + backup) when user explicitly abandons
          clearAllSessions();
          resetToEntry();
        }
      }}
    />
  );

  if (location.pathname === "/settings") {
    return <SettingsPage />;
  }

  if (recapSlug && recapLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-50 p-8 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Chargement du récap…</p>
      </div>
    );
  }

  if (recapSlug && recapErr) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-slate-50 p-8 dark:bg-slate-950">
        <p className="text-center text-slate-700 dark:text-slate-300">
          Récap introuvable ou expiré.
        </p>
        <button
          type="button"
          onClick={() => {
            window.history.replaceState({}, "", "/");
            window.location.reload();
          }}
          className="min-h-11 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Accueil
        </button>
      </div>
    );
  }

  if (recapSlug && recapData) {
    return (
      <GameSummary
        summary={recapData}
        readOnlyRecap
        onLeave={() => {
          window.history.replaceState({}, "", "/");
          setRecapSlug(null);
          setRecapData(null);
          window.location.reload();
        }}
      />
    );
  }

  // Entry screen
  if (stage === "entry") {
    return (
      <>
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        {rejoinCandidate && connected && !isReconnecting && !resumeCandidate && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-white">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Partie précédente</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Rejoindre la salle <span className="font-mono font-bold text-blue-600">{rejoinCandidate.roomCode}</span> avec le pseudo <span className="font-semibold text-slate-950">{rejoinCandidate.nickname}</span> ?
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const trimmedNickname = rejoinCandidate.nickname.trim();
                    const trimmedRoomCode = rejoinCandidate.roomCode.trim();
                    const existingSessionId = rejoinCandidate.sessionId;
                    unlockAudioAndVibration();
                    setErrorBanner(null);
                    setNicknameError(null);
                    setEntryBusyKind("join");
                    socket.emit("join_room", { code: trimmedRoomCode, nickname: trimmedNickname, sessionId: existingSessionId }, (res) => {
                      setEntryBusyKind(null);
                      if (res?.ok) {
                        saveSession(res.sessionId, res.code, trimmedNickname);
                        if (window.history.replaceState) window.history.replaceState({}, "", window.location.pathname);
                        setSessionId(res.sessionId);
                        setIsHost(res.isHost);
                        if (res.phase === "role_reveal" && res.rolesReveal) {
                          setRolesReveal(res.rolesReveal);
                          setHasSeenRole(false);
                          setStage("role_reveal");
                        } else if (res.phase === "playing" && res.gameState) {
                          setGameState(res.gameState);
                          setRole(res.gameState.me?.role ?? null);
                          setStage("game");
                        } else if (res.lobby) {
                          setLobby(res.lobby);
                          setStage("lobby");
                        }
                        setRejoinCandidate(null);
                        return;
                      }
                      setErrorBanner(res?.error || "Impossible de rejoindre.");
                      setRejoinCandidate(null);
                    });
                  }}
                  className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Oui, rejoindre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(LS_LAST_ROOM_KEY);
                      localStorage.removeItem(LS_LAST_SESSION_KEY);
                    } catch (e) {
                      logger.warn("localStorage non disponible:", e);
                    }
                    setRejoinCandidate(null);
                  }}
                  className="w-full rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Non, ignorer
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="stage-enter min-h-full"><HomePage
          connected={connected}
          nickname={nickname}
          setNickname={setNickname}
          nicknameError={nicknameError}
          setNicknameError={setNicknameError}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          entryBusyKind={entryBusyKind}
          errorBanner={errorBanner}
          onCreate={onCreate}
          onJoin={onJoin}
          onCancel={() => {
            entryReqRef.current += 1;
            setEntryBusyKind(null);
          }}
          onOpenSettings={() => navigate("/settings")}
          midJoinWait={midJoinWait}
          onCancelMidJoin={() => setMidJoinWait(null)}
        /></div>
      </>
    );
  }

// Lobby screen
if (stage === "lobby" && lobby) {
  return (
    <div className="stage-enter flex min-h-full flex-col bg-white text-slate-950 landing-dots dark:bg-slate-950 dark:text-white">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      {reconnectModal}
      <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="flex h-16 items-center justify-between px-4 sm:px-5">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setShowShareParty(true)}
            >
              Partager
            </Button>
            <SettingsButton size="sm" />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row relative">
        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-48 pt-4 md:max-w-none">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Code de salle</p>
            <p className="mt-1 break-all font-mono text-4xl font-black tracking-[0.18em] text-blue-600 sm:text-5xl">
              {lobby.code}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              {isHost ? "Vous êtes l’hôte" : "En attente de l’hôte"}
            </p>
          </div>

          {showShareParty && lobby?.code && (
            <SharePartyModal
              code={lobby.code}
              title="Inviter à cette salle"
              onClose={() => setShowShareParty(false)}
            />
          )}

          {errorBanner && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {errorBanner}
            </div>
          )}

          {joinRequestQueue.length > 0 && (
            <div className="mb-3 space-y-2">
              {joinRequestQueue.map((j) => (
                <div
                  key={j.requestId}
                  className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-medium text-amber-950">
                    <span className="font-bold">{j.nickname}</span> souhaite rejoindre
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      onClick={() => respondJoinRequest(j.requestId, true)}
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      onClick={() => respondJoinRequest(j.requestId, false)}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {geoError && (
            <div className="mb-3 break-words rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
              {geoError.message}
            </div>
          )}

          {!geoError && !position && (
            <div className="mb-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              Autorisez la position pour placer le centre de zone.
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Lobby en direct
              </h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {lobby.players?.length ?? 0} joueurs
              </span>
            </div>
            <CircularLobby
              players={lobby.players || []}
              hostSessionId={lobby.hostSessionId || sessionId}
              currentSessionId={sessionId}
            />
          </div>

          {isHost && (
            <div className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-4 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Configuration de la partie
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">
                    Rayon (m) : {settings?.globalRadiusM}
                  </label>
                  <SliderWithParticles
                    type="range"
                    min={100}
                    max={2000}
                    step={50}
                    value={settings?.globalRadiusM ?? 500}
                    onChange={(e) =>
                      pushSettings({ globalRadiusM: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">
                    Chats : {settings?.catCount ?? 1}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, (lobby.players?.length || 2) - 1)}
                    step={1}
                    value={Math.min(
                      settings?.catCount ?? 1,
                      Math.max(1, (lobby.players?.length || 2) - 1)
                    )}
                    onChange={(e) =>
                      pushSettings({ catCount: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400">
                  Difficulté
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => pushSettings({ jamRadiusM: 150 })}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      (settings?.jamRadiusM ?? 50) >= 120
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => pushSettings({ jamRadiusM: 80 })}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      (settings?.jamRadiusM ?? 50) >= 70 && (settings?.jamRadiusM ?? 50) < 120
                        ? "bg-amber-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Moyen
                  </button>
                  <button
                    type="button"
                    onClick={() => pushSettings({ jamRadiusM: 30 })}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      (settings?.jamRadiusM ?? 50) < 70
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Difficile
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Mode
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={(lobby.players?.length || 0) <= 2}
                    onClick={() => pushSettings({ gameMode: "infection" })}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      (lobby.players?.length || 0) <= 2
                        ? "cursor-not-allowed bg-slate-200 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700"
                        : (settings?.gameMode || "tag_swap") === "infection"
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                    }`}
                  >
                    Chats cumulés
                  </button>
                  <button
                    type="button"
                    onClick={() => pushSettings({ gameMode: "tag_swap" })}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      settings?.gameMode === "tag_swap"
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                    }`}
                  >
                    Chat tournant
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Options
                </p>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-900">
                  <span className="text-xs text-slate-800 dark:text-slate-100">
                    Limite de durée
                  </span>
                  <input
                    type="checkbox"
                    checked={!!settings?.timeLimitEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      const patch = { timeLimitEnabled: enabled };
                      if (!enabled && settings?.shrinkZoneEnabled) {
                        patch.shrinkZoneEnabled = false;
                      }
                      pushSettings(patch);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                </label>
                {settings?.timeLimitEnabled && (
                  <div className="mt-1 pl-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Minutes max : {settings?.timeLimitMinutes ?? 30}
                    </label>
                    <SliderWithParticles
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={settings?.timeLimitMinutes ?? 30}
                      onChange={(e) =>
                        pushSettings({
                          timeLimitMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}
                {settings?.timeLimitEnabled && (
                  <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-900">
                    <span className="text-xs text-slate-800 dark:text-slate-100">
                      Zone qui rétrécit
                    </span>
                    <input
                      type="checkbox"
                      checked={!!settings?.shrinkZoneEnabled}
                      onChange={(e) =>
                        pushSettings({ shrinkZoneEnabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {!isHost && (
            <button
              type="button"
              onClick={leaveGame}
              className="mt-4 min-h-11 w-full rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400"
            >
              Quitter la partie
            </button>
          )}
        </main>
      </div>

      {/* Fixed bottom button container */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-950 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95 dark:text-white">
        {isHost ? (
          <>
            <Button
              variant="primaryGradient"
              size="lg"
              className="w-full"
              onClick={onRevealRoles}
              disabled={!lobby.canStartGps || !lobby.canRevealRoles}
            >
              Révéler les rôles
            </Button>
            {!lobby.canRevealRoles && (
              <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
                Il faut au moins 2 joueurs dans la salle pour lancer la partie.
              </p>
            )}
            {lobby.canRevealRoles && !lobby.canStartGps && (
              <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
                Au moins une position GPS est nécessaire pour le centre de la zone.
              </p>
            )}
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={leaveGame}
            >
              Quitter la partie
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={leaveGame}
          >
            Quitter la partie
          </Button>
        )}
      </div>
    </div>
  );
}

// Role reveal screen
if (stage === "role_reveal" && rolesReveal) {
  const myPlayer = rolesReveal.players?.find(p => p.sessionId === sessionId);
  const myRole = myPlayer?.role;

  const handleCardClick = () => {
    logger.log('[handleCardClick] Card clicked, isFlipped:', isFlipped);
    setIsFlipped(prev => !prev);
    if (!hasSeenRole) {
      setHasSeenRole(true);
      socket?.emit("player_saw_role", {}, (res) => {
        if (!res?.ok) {
          logger.error("Failed to mark role as seen");
        }
      });
    }
  };

  const allPlayersSeenRole = rolesReveal.players?.every(p => p.hasSeenRole);

  return (
    <div className="stage-enter flex min-h-full flex-col bg-white text-slate-950 landing-dots dark:bg-slate-950 dark:text-white">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      {reconnectModal}

      {showShareParty && rolesReveal.code && (
        <SharePartyModal
          code={rolesReveal.code}
          title="Inviter à cette partie"
          onClose={() => setShowShareParty(false)}
        />
      )}

      <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="flex h-16 items-center justify-between px-4 sm:px-5">
          <BrandMark />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShareParty(true)}
              className="inline-flex min-h-11 items-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Partager
            </button>
            <SettingsButton size="sm" />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Avant la chasse</p>
            <p className="mt-1 break-all font-mono text-3xl font-black tracking-[0.18em] text-blue-600">
              {rolesReveal.code}
            </p>
            <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
              Attribution des rôles
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Touchez la carte pour révéler votre rôle.
            </p>
          </div>

          {errorBanner && (
            <div className="rounded-xl bg-red-100 p-3 text-sm text-red-900 dark:bg-red-950/80 dark:text-red-100">
              {errorBanner}
            </div>
          )}

          {joinRequestQueue.length > 0 && (
            <div className="space-y-2">
              {joinRequestQueue.map((j) => (
                <div
                  key={j.requestId}
                  className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                    <span className="font-bold">{j.nickname}</span> souhaite rejoindre
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      onClick={() => respondJoinRequest(j.requestId, true)}
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      onClick={() => respondJoinRequest(j.requestId, false)}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myPlayer && (
            <button
              type="button"
              className="mx-auto flex w-full max-w-sm flex-col items-center rounded-[2rem] border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950"
              onClick={() => {
                logger.log('[Card] Clicked directly, current isFlipped:', isFlipped);
                handleCardClick();
              }}
            >
              {!isFlipped ? (
                <>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1.1-1.5 2.2V14" />
                      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
                    </svg>
                  </span>
                  <p className="mt-4 text-lg font-black text-slate-950 dark:text-white">Touchez pour révéler</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">votre rôle</p>
                </>
              ) : (
                <>
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full text-white ${myRole === 'cat' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {myRole === 'cat' ? (
                        <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>
                      ) : (
                        <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>
                      )}
                    </svg>
                  </span>
                  <p className={`mt-4 text-3xl font-black uppercase tracking-tight ${myRole === 'cat' ? 'text-blue-600' : 'text-amber-500'}`}>
                    {myRole === 'cat' ? 'Chat' : 'Souris'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {myRole === 'cat'
                      ? 'Vous traquez les souris'
                      : 'Vous fuyez les chats'}
                  </p>
                  {hasSeenRole && (
                    <p className="mt-3 text-xs font-black uppercase tracking-widest text-emerald-600">Rôle vu</p>
                  )}
                </>
              )}
            </button>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
              Joueurs ({rolesReveal.players?.filter(p => p.hasSeenRole).length ?? 0}/{rolesReveal.players?.length ?? 0} ont vu leur rôle)
            </h2>
            <ul className="space-y-2">
              {rolesReveal.players?.map((p) => {
                const hasLocation = p.lat != null && p.lng != null;
                const isGrayedOut = !hasLocation;
                return (
                  <li
                    key={p.sessionId}
                    className={`flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-2xl p-3 ${
                      p.sessionId === sessionId
                        ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:ring-blue-800"
                        : isGrayedOut
                          ? "bg-slate-100 opacity-60 dark:bg-slate-900"
                          : "bg-slate-50 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black text-white ${
                        isGrayedOut ? 'bg-slate-400' : p.role === 'cat' ? 'bg-blue-600' : 'bg-amber-500'
                      }`}>
                        {p.nickname?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate whitespace-nowrap overflow-hidden text-ellipsis font-bold ${isGrayedOut ? 'text-slate-400' : 'text-slate-950 dark:text-white'}`}>
                          {p.nickname}
                          {p.sessionId === sessionId && (
                            <span className="ml-2 text-xs font-semibold text-blue-600">vous</span>
                          )}
                        </p>
                        <p className={`mt-0.5 text-xs font-semibold ${isGrayedOut ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isGrayedOut ? 'Localisation désactivée' : (p.hasSeenRole ? 'Rôle vu' : 'En attente…')}
                          {p.hasSeenRole && !isGrayedOut && (
                            <span className={`ml-2 font-black ${p.role === 'cat' ? 'text-blue-600' : 'text-amber-600'}`}>
                              {p.role === 'cat' ? 'Chat' : 'Souris'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {p.hasSeenRole && !isGrayedOut && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {isGrayedOut && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {isHost ? (
            <div className="relative">
              {(() => {
                const canStart = allPlayersSeenRole &&
                                 (rolesReveal?.players?.length ?? 0) >= 2 &&
                                 !geoError &&
                                 position;

                return (
                  <>
                    <Button
                      variant="primaryGradient"
                      size="lg"
                      className="relative z-10 w-full"
                      onClick={onBeginHunt}
                      disabled={!canStart}
                    >
                      {!allPlayersSeenRole
                        ? "En attente que tous voient leur rôle"
                        : geoError || !position
                          ? "Activez votre localisation"
                          : "Lancer la chasse"}
                    </Button>
                    {!allPlayersSeenRole && (
                      <p className="mt-2 text-center text-xs text-amber-600">
                        {rolesReveal.players?.filter(p => !p.hasSeenRole).length ?? 0} joueur(s) n'ont pas encore vu leur rôle
                      </p>
                    )}
                    {allPlayersSeenRole && (geoError || !position) && (
                      <p className="mt-2 text-center text-xs text-amber-600">
                        Vous devez activer votre localisation pour commencer
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              En attente du démarrage par l&apos;hôte…
            </p>
          )}
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={leaveGame}
          >
            Quitter la partie
          </Button>
        </main>
      </div>
    </div>
  );
}

  if (stage === "game" && !gameState) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 dark:bg-slate-950">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Synchronisation...</p>
        {geoError && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400">{geoError.message}</p>
        )}
      </div>
    );
  }

  if (stage === "summary" && summary) {
    return (
      <>
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        <GameSummary summary={summary} onLeave={leaveGame} />
      </>
    );
  }

  // Game screen
  if (stage === "game" && gameState) {
    const me = gameState.me;
    const isPrey =
      me?.role === "player" && !me?.spectator && !me?.captured;
    const isCat = me?.role === "cat" && !me?.spectator;
    const catLocked = Boolean(gameState.catMapLocked);
    const showMapTab = !catLocked || me?.role !== "cat" || me?.spectator;
    const capturedPrey = me?.captured && me?.role === "player";
    const powerCosts = (gameState?.powerCosts) || {
      noise: 20,
      invisibility_self: 40,
      invisibility_single: 70,
      invisibility_all_role: 130,
      zone_morph_player: 120,
      zone_morph_cat: 100,
      no_boundaries: 80,
      freeze_cats_single: 45,
      freeze_cats_multi: 80,
      freeze_cats_all: 140,
      fake_position: 60,
    };

    const powerLimits = gameState.powerLimits || {};
    const powerUses = gameState.powerUses || {};

    const formatUsage = (key) => {
      const used = Number(powerUses?.[key] || 0);
      const max = Number(powerLimits?.[key] || 0);
      if (max > 0) return `${used}/${max}`;
      if (used > 0) return `${used}`;
      return null;
    };

  // État du cercle de brouillage (zone jam des joueurs)
  // jam values are computed at top-level so they keep hook order stable
  // jamBase, jamScale, jamRadius, jamLevel are available here
  const jamIsMin = jamScale <= 0.51; // proche du palier min côté serveur (0.5)
  const jamIsMax = jamScale >= 1.49; // proche du palier max côté serveur (1.5)

    // Effet de pouvoir actif pour l'extension du HUD - collect all active effects
    const hudPowerEffects = [];
    let hudPowerUiNow = getServerTime();
    
    if (joinRequestEffect) {
      hudPowerEffects.push(joinRequestEffect);
      hudPowerUiNow = Date.now();
    }
    if (baliseLureSelecting) {
      hudPowerEffects.push({ kind: "balise_lure" });
    }
    if (activeNoise) {
      const elapsed = getServerTime() - activeNoise.startedAt;
      if (elapsed <= activeNoise.durationSec * 1000) {
        hudPowerEffects.push({ kind: "noise", ...activeNoise });
        hudPowerUiNow = noiseUiNow;
      }
    }
    if (me?.invisUntil && me.invisUntil > ghostUiNow && me?.invisSince) {
      // Show ghost notification if I'm invisible (whether I used it myself or someone else used it on me)
      hudPowerEffects.push({
        kind: "ghost",
        invisUntil: me.invisUntil,
        invisSince: me.invisSince,
        scope: invisNotification?.scope || "self",
        targetNames: invisNotification?.targetNames,
      });
      hudPowerUiNow = ghostUiNow;
    }
    if (me?.immobilizedUntil && me.immobilizedUntil > ghostUiNow) {
      hudPowerEffects.push({ kind: "immobilized", until: me.immobilizedUntil });
      hudPowerUiNow = ghostUiNow;
    }
    // If we have a recent transient jam notification (2s), show it with progress
    // and skip the older/persistent jam notification to avoid duplicates.
    if (recentJamNotification) {
      hudPowerEffects.push(recentJamNotification);
      hudPowerUiNow = getServerTime();
  }

    // If we have a balise blocked notification (2s), show it
    if (baliseBlockedNotification) {
      hudPowerEffects.push(baliseBlockedNotification);
      hudPowerUiNow = Date.now();
  }

    // Check for balise capture in progress - only show for the player capturing
    const balises = gameState?.balises || [];
    for (const balise of balises) {
      if (balise.beingCapturedBy === sessionId && !balise.capturedBy) {
        hudPowerEffects.push({
          kind: "balise_capture",
          baliseId: balise.id,
          nickname: "Vous",
          isMyCapture: true,
          captureProgress: balise.captureProgress || 0,
          awardedCoins: balise.awardedCoins || null,
        });
        hudPowerUiNow = getServerTime();
        break; // Only show one balise capture notification at a time
      }
    }

    // Check for fake position active - only show for the player with fake position
    if (me?.fakePosition && me.fakePosition.until > Date.now()) {
      hudPowerEffects.push({
        kind: "fake_position",
        until: me.fakePosition.until,
        onCancel: () => {
          socket?.emit("use_power", { kind: "fake_position_cancel" }, (res) => {
            if (!res?.ok) logger.error('[fake_position_cancel] Error:', res?.error);
          });
        },
      });
      hudPowerUiNow = Date.now();
    }

    const isCooldown = (key) => (localCooldowns?.[key] || 0) > getServerTime();
    const cooldownUntil = (key) => localCooldowns?.[key] || 0;
    const setCd = (key, secs) => setLocalCooldowns((m) => ({ ...m, [key]: getServerTime() + secs * 1000 }));

    const sameRoleAliveCount = (gameState.roster || []).filter((p) => p.role === role && !p.spectator && !p.captured).length;
    const catAliveCount = (gameState.roster || []).filter((p) => p.role === "cat" && !p.spectator && !p.captured).length;
    const canTeamInvisibility = sameRoleAliveCount > 1;
    const canTeamFreezeCats = catAliveCount > 1;

    // Lock Sans limites until 5 mins (évite le message "disponible plus tard")
    const noBoundariesUnlockAt = gameState?.huntStartedAt ? gameState.huntStartedAt + 5 * 60 * 1000 : 0;
    const isNoBoundariesEarlyLocked = Date.now() < noBoundariesUnlockAt;
    const noBoundariesCurrentLockUntil = isNoBoundariesEarlyLocked 
      ? noBoundariesUnlockAt 
      : (me?.outOfBoundsOverrideUntil && me.outOfBoundsOverrideUntil > Date.now()) 
        ? me.outOfBoundsOverrideUntil 
        : cooldownUntil("no_boundaries");
    const estimatedFreezeCost = (() => {
      if (freezeTargetMode === "all") return Number(powerCosts.freeze_cats_all || 140);
      if (selectedFreezeTargets.length > 1) return Number(powerCosts.freeze_cats_multi || 80);
      return Number(powerCosts.freeze_cats_single || 45);
    })();
    const estimatedNoiseCost = (() => {
      const base = Number(powerCosts.noise || 20);
      const durationSec = noiseDuration <= 10 ? 10 : noiseDuration >= 60 ? 60 : 30;
      const durationFactor = durationSec === 10 ? 0.5 : durationSec === 60 ? 1.8 : 1.0;
      const volumeFactor = noiseVolume === "low" ? 0.7 : noiseVolume === "high" ? 1.4 : 1.0;

      let count = 0;
      if (noiseTargetMode === "all") {
        count = (rosterList || []).filter((p) => p.role !== role && !p.spectator).length;
      } else {
        count = selectedNoiseTargets.length || 1; // minimum 1 pour afficher un ordre de grandeur
      }
      if (count <= 0) return 0;
      const raw = base * durationFactor * volumeFactor * count;
      return Math.max(1, Math.ceil(raw));
    })();

    // Bornes théoriques min/max de coût pour affichage (en fonction des paramètres extrêmes)
    const noiseMinCost = (() => {
      const base = Number(powerCosts.noise || 20);
      const durationFactor = 0.5; // 10s
      const volumeFactor = 0.7; // low
      const count = 1;
      return Math.max(1, Math.ceil(base * durationFactor * volumeFactor * count));
    })();
    const noiseMaxCost = (() => {
      const base = Number(powerCosts.noise || 20);
      const durationFactor = 1.8; // 60s
      const volumeFactor = 1.4; // high
      const maxTargets = (rosterList || []).filter((p) => p.role !== role && !p.spectator).length || 1;
      return Math.max(1, Math.ceil(base * durationFactor * volumeFactor * maxTargets));
    })();

    const freezeMinCost = Number(powerCosts.freeze_cats_single || 45);
    const freezeMaxCost = Number(powerCosts.freeze_cats_all || powerCosts.freeze_cats_multi || freezeMinCost);

    const invisMinCost = Number(powerCosts.invisibility_self || 40);
    const invisMaxCost = Number(powerCosts.invisibility_all_role || powerCosts.invisibility_single || invisMinCost);

    const estimatedInvisCost = (() => {
      const durationSec = Math.max(30, Math.min(900, Number(invisDurationSec) || 300));
      const durationFactor = Math.pow(durationSec / 300, 1.6);
      if (invisScope === "self") {
        const base = Number(powerCosts.invisibility_self || 40);
        return Math.max(1, Math.round(base * durationFactor));
      }
      // multi: on utilise le même schéma que le backend (single/multi)
      const base = Number(powerCosts.invisibility_single || 70);
      const count = (selectedInvisTargets || []).length || 1;
      const perTarget = Math.max(1, Math.round(base * durationFactor));
      return perTarget * count;
    })();

    const tabBtn = (id, label, disabled = false, variant = "top") => {
      const active = gameTab === id && !disabled;
      const base =
        "flex-1 py-3 text-sm font-semibold transition-colors md:py-2.5 disabled:opacity-40";
      const topCls = active
        ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-300"
        : "border-b-2 border-transparent text-slate-500";
      const bottomCls = active
        ? "text-blue-700 dark:text-blue-200"
        : "text-slate-500";
      return (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => setGameTab(id)}
          className={`${base} ${variant === "bottom" ? bottomCls : topCls}`}
        >
          {label}
        </button>
      );
    };

    return (
      <div className="stage-enter flex h-full min-h-0 flex-col bg-white pt-[env(safe-area-inset-top)] text-slate-950 dark:bg-slate-950 dark:text-white">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}

        {isReconnecting && !showReconnectModal && (
          <div className="z-[1200] shrink-0 border-b border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">Reconnexion…</span>
              {!isHost && (
                <button
                  type="button"
                  onClick={leaveGame}
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  Quitter
                </button>
              )}
            </div>
          </div>
        )}

        {isHost && joinRequestQueue.length > 0 && (
          <div className="z-[1200] shrink-0 space-y-2 border-b border-amber-200 bg-amber-50/95 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/80">
            {joinRequestQueue.map((j) => (
              <div
                key={j.requestId}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
                  <span className="font-bold">{j.nickname}</span> demande à rejoindre
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-[8px] bg-[#5B7FA5] px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => respondJoinRequest(j.requestId, true)}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="rounded-[8px] bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    onClick={() => respondJoinRequest(j.requestId, false)}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {errorBanner && (
          <div className="z-10 shrink-0 bg-red-100 px-3 py-2 text-center text-sm text-red-900 dark:bg-red-950/95 dark:text-red-100">
            {errorBanner}
            <button type="button" className="ml-2 underline" onClick={() => setErrorBanner(null)}>OK</button>
          </div>
        )}

        {showShareParty && currentRoomCode && (
          <SharePartyModal
            code={currentRoomCode}
            title="Partager cette partie"
            onClose={() => setShowShareParty(false)}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Main content area */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-200 dark:bg-slate-900">
              <div className={"absolute inset-0 tab-pane " + (gameTab === "social" ? "tab-pane-active" : "tab-pane-right")}>
                <div className="h-full overflow-auto pt-28 md:pt-0">
                <SocialPanel
                  roomCode={currentRoomCode}
                  rosterList={rosterList}
                  sessionId={sessionId}
                  partyChatMessages={partyChatMessages}
                  onShare={() => setShowShareParty(true)}
                  onSelectPlayer={setSelectedPlayer}
                  onSendChat={sendPartyChat}
                  position={position}
                  socket={socket}
                  onFocusLocation={onFocusChatLocation}
                  ghostUiNow={ghostUiNow}
                  roleBadgeText={roleBadgeText}
                />
                </div>
              </div>

              <div className={"absolute inset-0 overflow-auto tab-pane " + (gameTab === "powers" ? "tab-pane-active" : "tab-pane-right")}>
                <div className="h-full overflow-auto px-4 pb-24 pt-4">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-[28px] leading-tight font-medium text-slate-900 tracking-tight dark:text-white">Super pouvoirs</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <PowerCard
                      title="Invisibilité"
                      emoji="👻"
                      stars={4}
                      gradient={["#6366F1", "#A78BFA"]}
                      costText={`${invisMinCost} - ${invisMaxCost}`}
                      usageLabel={formatUsage("invisibility")}
                      estimatedCost={estimatedInvisCost}
                      insufficientCoins={(me?.coins ?? 0) < estimatedInvisCost}
                      details={<>
                        Devenez invisible pendant un certain temps. Le coût dépend de la <b>durée</b> et du <b>nombre de cibles</b>.
                      </>}
                      onUse={() => {
                        if (isCooldown("invisibility")) return;
                        const scope = invisScope === "self" ? "self" : "multi";
                        const body =
                          scope === "self"
                            ? { kind: "invisibility", scope, durationSec: invisDurationSec }
                            : { kind: "invisibility", scope, targetSessionIds: selectedInvisTargets, durationSec: invisDurationSec };
                        if (scope === "multi" && !selectedInvisTargets?.length) {
                          addNotification("Choisissez au moins une cible", "error");
                          return;
                        }
                        socket?.emit("use_power", body, (res) => {
                          if (res?.ok) {
                            setCd("invisibility", 120);
                            // Show HUD notification via game state (server will update me.invisUntil)
                            // Avoid system notification for power usage
                            setGameTab('map');
                          } else {
                            addNotification(res?.error || "Erreur", "error");
                          }
                        });
                      }}
                      locked={isCooldown("invisibility")}
                      lockReason="Recharge"
                      lockUntil={cooldownUntil("invisibility")}
                    >
                      <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Qui rendre invisible :</span>
                          <SegmentedControl
                            value={invisScope}
                            onChange={setInvisScope}
                            options={[{ value: "self", label: "Moi" }, { value: "single", label: "Cible" }]}
                          />
                        </div>
                        {invisScope === "single" && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Choisir les cibles
                            </div>
                            <div className="max-h-32 space-y-1.5 overflow-y-auto text-[13px]">
                              {rosterList
                                .filter((p) => !p.spectator && p.sessionId !== me?.sessionId)
                                .map((p) => {
                                  const checked = (selectedInvisTargets || []).includes(p.sessionId);
                                  return (
                                    <div
                                      key={p.sessionId}
                                      onClick={() => {
                                        setSelectedInvisTargets((prev) => {
                                          const l = prev || [];
                                          if (checked) return l.filter((id) => id !== p.sessionId);
                                          return [...l, p.sessionId];
                                        });
                                      }}
                                      className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2 transition-all ${
                                        checked 
                                          ? "bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800" 
                                          : "bg-slate-50 border border-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <span className={`truncate font-semibold ${checked ? "text-blue-800 dark:text-blue-200" : "text-slate-700 dark:text-slate-200"}`}>
                                        {p.nickname}
                                      </span>
                                      {checked && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1 pt-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Durée</span>
                          <DiscreteSlider
                            options={[
                              { label: "1 min", value: 60 },
                              { label: "5 min", value: 300 },
                              { label: "10 min", value: 600 },
                              { label: "15 min", value: 900 },
                            ]}
                            value={invisDurationSec}
                            onChange={setInvisDurationSec}
                            color="blue"
                          />
                        </div>

                        <AnimatedPrice value={estimatedInvisCost} />
                      </div>
                    </PowerCard>

                    <PowerCard
                      title="Bruit fantôme"
                      emoji="🔊"
                      stars={2}
                      gradient={["#F43F5E", "#FB923C"]}
                      costText={`${noiseMinCost} - ${noiseMaxCost}`}
                      locked={isCooldown("noise")}
                      lockReason="Recharge"
                      lockUntil={cooldownUntil("noise")}
                      estimatedCost={estimatedNoiseCost}
                      insufficientCoins={(me?.coins ?? 0) < estimatedNoiseCost}
                      usageLabel={formatUsage("noise")}
                      details={<>
                        Joue un son désagréable sur un ou plusieurs téléphones adverses. Le prix dépend de la <b>durée</b>, du <b>volume</b> et du <b>nombre de cibles</b>.
                      </>}
                      onUse={() => {
                        if (isCooldown("noise")) return;
                        const targets =
                          noiseTargetMode === "all"
                            ? (rosterList || [])
                                .filter((p) => p.sessionId !== me?.sessionId && !p.spectator)
                                .map((p) => p.sessionId)
                            : selectedNoiseTargets;
                        if (!targets.length) {
                          addNotification("Choisissez au moins une cible", "error");
                          return;
                        }
                        const durationSec = noiseDuration;
                        const volume = noiseVolume;
                        socket?.emit(
                          "use_power",
                          {
                            kind: "noise",
                            targetSessionIds: targets,
                            durationSec,
                            volume,
                          },
                          (res) => {
                            if (res?.ok) {
                              setCd("noise", 60);
                                      // Immediately show HUD noise effect and switch to game tab
                                      setActiveNoise({ startedAt: getServerTime(), durationSec, volume, by: me?.nickname });
                                      setGameTab('map');
                            } else {
                              addNotification(res?.error || "Erreur", "error");
                            }
                          }
                        );
                      }}
                    >
                      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Cibles :</span>
                          <SegmentedControl
                            value={noiseTargetMode}
                            onChange={setNoiseTargetMode}
                            options={[{ value: "all", label: "Tous" }, { value: "single", label: "Choix" }]}
                          />
                        </div>
                        
                        {noiseTargetMode === "single" && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Choisir les cibles
                            </div>
                            <div className="max-h-32 space-y-1.5 overflow-y-auto text-[13px]">
                              {rosterList
                                .filter((p) => p.sessionId !== me?.sessionId && !p.spectator)
                                .map((p) => {
                                  const checked = selectedNoiseTargets.includes(p.sessionId);
                                  return (
                                    <div
                                      key={p.sessionId}
                                      onClick={() => {
                                        setSelectedNoiseTargets((prev) => {
                                          if (checked) return prev.filter((id) => id !== p.sessionId);
                                          return [...prev, p.sessionId];
                                        });
                                      }}
                                      className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2 transition-all ${
                                        checked 
                                          ? "bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-500/30 shadow-inner" 
                                          : "bg-slate-50 border border-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <span className={`truncate font-semibold ${checked ? "text-amber-900 dark:text-amber-200" : "text-slate-700 dark:text-slate-200"}`}>
                                        {p.nickname}
                                      </span>
                                      {checked && <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                        
                        {noiseTargetMode === "all" && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200 text-center">
                            Tous les joueurs seront ciblés.
                          </div>
                        )}

                        <div className="space-y-4 pt-2">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Durée</span>
                            <DiscreteSlider 
                              options={[
                                { label: '10s', value: 10 },
                                { label: '30s', value: 30 },
                                { label: '1min', value: 60 }
                              ]}
                              value={noiseDuration}
                              onChange={setNoiseDuration}
                              color="amber"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Volume</span>
                            <DiscreteSlider 
                              options={[
                                { label: 'Bas', value: 'low' },
                                { label: 'Moyen', value: 'medium' },
                                { label: 'Fort', value: 'high' }
                              ]}
                              value={noiseVolume}
                              onChange={setNoiseVolume}
                              color="amber"
                            />
                          </div>
                        </div>

                        <AnimatedPrice value={estimatedNoiseCost} />
                      </div>
                    </PowerCard>

                    {role === "player" ? (
                      <>
                        <PowerCard
                          title="Leurre de position"
                          emoji="🎭"
                          gradient={["#8B5CF6", "#EC4899"]}
                          stars={3}
                          costText={`${powerCosts.fake_position}`}
                          usageLabel={formatUsage("fake_position")}
                          estimatedCost={Number(powerCosts.fake_position)}
                          insufficientCoins={(me?.coins ?? 0) < Number(powerCosts.fake_position)}
                          details={<>
                            Affiche une fausse position aux autres joueurs pendant un certain temps. Les déplacements aléatoires restent crédibles et dans la zone de jeu.
                          </>}
                          onUse={() => {
                            socket?.emit("use_power", { kind: "fake_position", durationSec: 60 }, (res) => {
                              if (res?.ok) {
                                // Rely on HUD/game state for fake position; avoid system notification
                                setGameTab('map');
                              } else if (res?.error) {
                                addNotification(res.error || "Erreur", "error");
                              }
                            });
                          }}
                        />

                        <PowerCard
                          title="Agrandir le cercle de brouillage"
                          emoji="📡"
                          gradient={["#10B981", "#34D399"]}
                          costText={`${powerCosts.zone_morph_player}`}
                          locked={jamIsMax}
                          lockReason={jamIsMax ? "Déjà au plus grand" : ""}
                          estimatedCost={Number(powerCosts.zone_morph_player)}
                          insufficientCoins={(me?.coins ?? 0) < Number(powerCosts.zone_morph_player)}
                          details={<>
                            Agrandit le cercle de brouillage des joueurs. Si les chats l'ont réduit au maximum, vous pouvez le ramener directement à l'extrême opposé si vous avez assez de pièces.
                          </>}
                          onUse={() => {
                            if (jamIsMax) return; // évite d'envoyer une requête inutile
                            socket?.emit("use_power", { kind: "zone_morph" }, (res) => {
                              if (res?.ok) {
                                // Game notification handles jam level display
                                setGameTab('map');
                              } else if (res?.error) {
                                // On supprime le cas "Déjà au maximum" côté UX : on se contente de bloquer le bouton
                                if (!/Déjà au maximum/i.test(res.error)) {
                                  addNotification(res.error, "error");
                                }
                              }
                            });
                          }}
                        >
                          <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">État du cercle de brouillage</span>
                              <div className="flex items-center gap-2">
                                {["small", "normal", "large"].map((lvl) => {
                                  const active = lvl === jamLevel;
                                  const label = lvl === "small" ? "Petit" : lvl === "large" ? "Grand" : "Moyen";
                                  return (
                                    <div key={lvl} className="flex flex-col items-center text-[10px]">
                                      <div
                                        className={`h-2 w-6 rounded-full transition-all ${
                                          active
                                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                                            : "bg-slate-300 dark:bg-slate-700"
                                        }`}
                                      />
                                      <span className={`mt-0.5 ${active ? "font-semibold text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
                                        {label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {jamIsMax && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Le cercle est déjà au palier le plus grand.
                              </p>
                            )}
                          </div>
                        </PowerCard>
                      </>
                    ) : (
                      <>
                        <PowerCard
                          title="Réduire le cercle de brouillage"
                          emoji="📡"
                          gradient={["#EF4444", "#F97316"]}
                          stars={5}
                          costText={`${powerCosts.zone_morph_cat}`}
                          usageLabel={formatUsage("zone_morph_cat")}
                          locked={jamIsMin}
                          lockReason={jamIsMin ? "Déjà au plus petit" : ""}
                          estimatedCost={Number(powerCosts.zone_morph_cat)}
                          insufficientCoins={(me?.coins ?? 0) < Number(powerCosts.zone_morph_cat)}
                          details={<>
                            Rétrécit le cercle de brouillage des joueurs (zone floue autour d'eux). Si les joueurs l'ont agrandi, une première utilisation le ramène à la normale, puis le réduit encore.
                          </>}
              onUse={() => {
                            if (jamIsMin) return;
                            socket?.emit("use_power", { kind: "zone_morph" }, (res) => {
                              if (res?.ok) {
                // Switch to game tab when using a power
                setGameTab('map');
                              } else if (res?.error) {
                                if (!/Déjà au minimum/i.test(res.error)) {
                                  addNotification(res.error || "Erreur", "error");
                                }
                              }
                            });
                          }}
                        >
                          <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">État du cercle de brouillage</span>
                              <div className="flex items-center gap-2">
                                {["small", "normal", "large"].map((lvl) => {
                                  const active = lvl === jamLevel;
                                  const label = lvl === "small" ? "Petit" : lvl === "large" ? "Grand" : "Moyen";
                                  return (
                                    <div key={lvl} className="flex flex-col items-center text-[10px]">
                                      <div
                                        className={`h-2 w-6 rounded-full transition-all ${
                                          active
                                            ? "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"
                                            : "bg-slate-300 dark:bg-slate-700"
                                        }`}
                                      />
                                      <span className={`mt-0.5 ${active ? "font-semibold text-orange-600 dark:text-orange-300" : "text-slate-500 dark:text-slate-400"}`}>
                                        {label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {jamIsMin && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Le cercle est déjà au palier le plus petit.
                              </p>
                            )}
                          </div>
                        </PowerCard>

                        <PowerCard
                          title="Balise-leurre"
                          emoji="🎯"
                          gradient={["#8B5CF6", "#EC4899"]}
                          stars={4}
                          costText={`${powerCosts.balise_leurre || 60}`}
                          locked={Boolean(powerLimits?.balise_leurre) && Number(powerUses?.balise_leurre || 0) >= Number(powerLimits?.balise_leurre || 1)}
                          lockReason="Utilisation unique"
                          lockUntil={null}
                          estimatedCost={Number(powerCosts.balise_leurre || 60)}
                          insufficientCoins={(me?.coins ?? 0) < Number(powerCosts.balise_leurre || 60)}
                          usageLabel={formatUsage("balise_leurre")}
                          details={<>
                            Permet de programmer en secret l'emplacement de la <b>prochaine balise</b> qui apparaîtra dans la partie. Utilisable une seule fois.
                            Touchez la carte pour choisir l'emplacement du leurre.
                          </>}
                          onUse={() => {
                            if (Boolean(powerLimits?.balise_leurre) && Number(powerUses?.balise_leurre || 0) >= Number(powerLimits?.balise_leurre || 1)) {
                              addNotification("Pouvoir déjà utilisé.", "error");
                              return;
                            }
                            setBaliseLureSelecting(true);
                            setGameTab("map");
                          }}
                        >
                          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
                            <p>
                              Quand le mode est actif, touchez la carte pour placer un marqueur violet. Ensuite, le jeu utilisera ce point pour la prochaine balise au lieu d'un emplacement aléatoire.
                            </p>
                            {baliseLureTarget && (
                              <>
                                <p className="text-[11px] text-purple-600 dark:text-purple-300">
                                  Position sélectionnée prête pour la prochaine balise.
                                </p>
                                {gameState.nextBaliseAt && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Prochaine balise dans {Math.max(0, Math.floor((gameState.nextBaliseAt - getServerTime()) / 1000))}s.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </PowerCard>
                      </>
                    )}

                    <PowerCard
                      title="Immobiliser un joueur"
                      emoji="🧊"
                      stars={3}
                      gradient={["#3B82F6", "#60A5FA"]}
                      locked={isCooldown("freeze_cats")}
                      lockReason="Recharge"
                      lockUntil={cooldownUntil("freeze_cats")}
                      estimatedCost={estimatedFreezeCost}
                      insufficientCoins={(me?.coins ?? 0) < estimatedFreezeCost}
                      details={<>
                        Cache la carte du joueur ciblé pendant un court instant. Idéal pour s'échapper ou bloquer un adversaire.
                      </>}
                      onUse={() => {
                        if (isCooldown("freeze_cats")) return;
                        const targetIds =
                          freezeTargetMode === "all"
                            ? []
                            : selectedFreezeTargets;
                        if (freezeTargetMode === "single" && !targetIds.length) {
                          addNotification("Choisissez au moins une cible", "error");
                          return;
                        }
                        const scope =
                          freezeTargetMode === "all"
                            ? "all"
                            : targetIds.length > 1
                              ? "multi"
                              : "single";
                        const payload =
                          scope === "all"
                            ? { kind: "freeze_cats", scope, durationSec: freezeDuration }
                            : scope === "multi"
                              ? { kind: "freeze_cats", scope, targetSessionIds: targetIds, durationSec: freezeDuration }
                              : { kind: "freeze_cats", scope, targetSessionId: targetIds[0], durationSec: freezeDuration };
                        socket?.emit("use_power", payload, (res) => {
                          if (res?.ok) {
                            setCd("freeze_cats", 90);
                              // HUD will reflect immobilized players via game state, avoid system notification
                              setGameTab('map');
                          } else {
                            addNotification(res?.error || "Erreur", "error");
                          }
                        });
                      }}
                    >
                      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Cibles :</span>
                          <SegmentedControl
                            value={freezeTargetMode}
                            onChange={setFreezeTargetMode}
                            options={[{ value: "all", label: "Tous" }, { value: "single", label: "Choix" }]}
                          />
                        </div>
                        
                        {freezeTargetMode === "single" && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Choisir les cibles
                            </div>
                            <div className="max-h-28 space-y-1.5 overflow-y-auto text-[13px]">
                              {rosterList
                                .filter((p) => !p.spectator && p.sessionId !== me?.sessionId)
                                .map((p) => {
                                  const checked = selectedFreezeTargets.includes(p.sessionId);
                                  return (
                                    <div
                                      key={p.sessionId}
                                      onClick={() => {
                                        setSelectedFreezeTargets((prev) => {
                                          if (checked) return prev.filter((id) => id !== p.sessionId);
                                          return [...prev, p.sessionId];
                                        });
                                      }}
                                      className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2 transition-all ${
                                        checked 
                                          ? "bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-500/30 shadow-inner" 
                                          : "bg-slate-50 border border-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <span className={`truncate font-semibold ${checked ? "text-blue-900 dark:text-blue-200" : "text-slate-700 dark:text-slate-200"}`}>
                                        {p.nickname}
                                      </span>
                                      {checked && <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                        
                        {freezeTargetMode === "all" && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[13px] font-semibold text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 text-center">
                            Tous les autres joueurs seront immobilisés.
                          </div>
                        )}
                        
                        <div className="space-y-4 pt-2">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Durée</span>
                            <DiscreteSlider 
                              options={[
                                { label: '10s', value: 10 },
                                { label: '20s', value: 20 },
                                { label: '40s', value: 40 }
                              ]}
                              value={freezeDuration}
                              onChange={setFreezeDuration}
                              color="blue"
                            />
                          </div>
                        </div>

                        <AnimatedPrice value={estimatedFreezeCost} />
                      </div>
                    </PowerCard>
                  </div>
                </div>
              </div>

              <div className={"absolute inset-0 tab-pane " + (gameTab === "settings" ? "tab-pane-active" : "tab-pane-right")}>
                <SettingsPage
                  embedded
                  inGame
                  nickname={me?.nickname || nickname}
                  onLeaveGame={leaveGame}
                  admin={(me?.nickname || nickname || "").trim().toLowerCase() === "karim"
                    ? {
                        roomCode: currentRoomCode,
                        rosterList,
                        sessionId,
                        onEndGame: () => {
                          if (window.confirm("Terminer la partie pour tout le monde et afficher le récapitulatif ?")) {
                            adminEndGame();
                          }
                        },
                        onAddTime: adminAddTime,
                        onAdjustCoins: (targetSessionId, delta) => {
                          socket?.emit("admin_adjust_coins", { targetSessionId, delta }, (res) => {
                            if (res?.ok) {
                              if (targetSessionId === sessionId) pushCoin(delta, "Admin");
                            } else {
                              addNotification(res?.error || "Action refusee", "error");
                            }
                          });
                        },
                        onSetRole: adminSetRole,
                        onKick: adminKick,
                      }
                    : null}
                />
              </div>

              {gameTab === "map" && catLocked && isCat && (
                <CatMapLockOverlay mapUnlockAt={gameState.mapUnlockAt} socket={socket} getServerTime={getServerTime} />
              )}

              {gameTab === "map" && captureCooldownUntil && Date.now() < captureCooldownUntil && isCat && (
                <CatMapLockOverlay mapUnlockAt={captureCooldownUntil} socket={socket} getServerTime={getServerTime} />
              )}

              <div className={"absolute inset-0 tab-pane " + (gameTab === "map" ? "tab-pane-active" : "tab-pane-left")}>
              {!(catLocked && isCat) && (
                <div className="relative h-full w-full">
                  <MapControls
                    basemapId={mapBasemap}
                    onBasemapChange={(id) => {
                      setMapBasemap(id);
                      if (MAPBOX_STYLES[id]) setMapStyleId(id);
                    }}
                    onRecenter={() => setRecenterTick((n) => n + 1)}
                    onZoomIn={() => setZoomInTick((n) => n + 1)}
                    onZoomOut={() => setZoomOutTick((n) => n + 1)}
                  />
                  <GameMap
                    gameState={gameState}
                    role={role}
                    mySessionId={sessionId}
                    basemapId={mapBasemap}
                    recenterTick={recenterTick}
                    zoomInTick={zoomInTick}
                    zoomOutTick={zoomOutTick}
                    geoChatItems={geoChatItems}
                    focusCenter={focusCenter}
                    focusTick={focusTick}
                    focusZoom={focusZoom}
                    highlightSessionId={highlightSessionId}
                    onPlayerClick={setSelectedPlayer}
                    baliseLureSelecting={baliseLureSelecting}
                    baliseLureTarget={baliseLureTarget}
                    onBaliseLureSelect={(lat, lng) => {
                      setBaliseLureTarget({ lat, lng });
                      setBaliseLureSelecting(false);
                      socket?.emit("use_power", { kind: "balise_leurre", lat, lng }, (res) => {
                        if (res?.ok) {
                            // HUD will show confirmation; avoid system notification
                            setGameTab('map');
                        } else {
                          addNotification(res?.error || "Erreur", "error");
                        }
                      });
                    }}
                  />
                </div>
              )}
              </div>

              {(gameTab === "map" || gameTab === "social") && (
                <>
                  {/* HUD mobile en haut */}
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-[800] pt-1 md:hidden">
                    <MapHud
                      variant="mobile"
                      role={role}
                      isSpectator={me?.spectator}
                      jamLevel={jamLevel}
                      connected={connected}
                      shrinkZoneEnabled={gameState.settings?.shrinkZoneEnabled}
                      timeLimitEnabled={gameState.settings?.timeLimitEnabled}
                      currentRadius={gameState.effectiveGlobalRadiusM}
                      nextRadius={gameState.nextPhaseRadiusM}
                      phaseEndsAt={gameState.phaseEndsAt}
                      shrinkStartsAt={gameState.shrinkStartsAt}
                      phaseState={gameState.zonePhaseState}
                      totalPhases={gameState.totalPhases}
                      currentPhase={gameState.currentPhase}
                      nextBaliseAt={gameState.nextBaliseAt}
                      baliseExpiresAt={baliseExpiresAt}
                      timeLimitEndsAt={gameState.timeLimitEndsAt}
                      catLocked={catLocked}
                      isCat={isCat}
                      mapUnlockAt={gameState.mapUnlockAt}
                      socket={socket}
                      powerEffect={hudPowerEffects.length > 0 ? hudPowerEffects : null}
                      powerUiNow={hudPowerUiNow}
                      gameStartedAt={gameState.huntStartedAt}
                      onGhostCancel={() => {
                        socket?.emit("use_power", { kind: "invisibility_cancel" }, (res) => {
                          if (!res?.ok && res?.error) addNotification(res.error, "error");
                        });
                      }}
                      onRoleModalOpen={() => setShowRoleModal(true)}
                      onZoneModalOpen={() => setShowZoneModal(true)}
                      onGameModalOpen={() => setShowGameModal(true)}
                      coins={me?.coins || 0}
                      onCoinsModalOpen={() => setShowCoinsModal(true)}
                      onPlayerModalOpen={() => setShowPlayerModal(true)}
                      notificationsVisible={gameTab === "map"}
                    />
                  </div>
                  <div className="pointer-events-none absolute left-3 top-14 z-[800] hidden md:block">
                    <MapHud
                      variant="desktop"
                      role={role}
                      isSpectator={me?.spectator}
                      jamLevel={jamLevel}
                      connected={connected}
                      shrinkZoneEnabled={gameState.settings?.shrinkZoneEnabled}
                      timeLimitEnabled={gameState.settings?.timeLimitEnabled}
                      currentRadius={gameState.effectiveGlobalRadiusM}
                      nextRadius={gameState.nextPhaseRadiusM}
                      phaseEndsAt={gameState.phaseEndsAt}
                      shrinkStartsAt={gameState.shrinkStartsAt}
                      phaseState={gameState.zonePhaseState}
                      totalPhases={gameState.totalPhases}
                      currentPhase={gameState.currentPhase}
                      nextBaliseAt={gameState.nextBaliseAt}
                      baliseExpiresAt={baliseExpiresAt}
                      timeLimitEndsAt={gameState.timeLimitEndsAt}
                      catLocked={catLocked}
                      isCat={isCat}
                      mapUnlockAt={gameState.mapUnlockAt}
                      socket={socket}
                      powerEffect={hudPowerEffects.length > 0 ? hudPowerEffects : null}
                      powerUiNow={hudPowerUiNow}
                      gameStartedAt={gameState.huntStartedAt}
                      onGhostCancel={() => {
                        socket?.emit("use_power", { kind: "invisibility_cancel" }, (res) => {
                          if (!res?.ok && res?.error) addNotification(res.error, "error");
                        });
                      }}
                      onRoleModalOpen={() => setShowRoleModal(true)}
                      onZoneModalOpen={() => setShowZoneModal(true)}
                      onGameModalOpen={() => setShowGameModal(true)}
                      coins={me?.coins || 0}
                      onCoinsModalOpen={() => setShowCoinsModal(true)}
                      onPlayerModalOpen={() => setShowPlayerModal(true)}
                      notificationsVisible={gameTab === "map"}
                    />
                  </div>
                </>
              )}

              <CoinFeed socket={socket} sessionId={sessionIdRef.current} />
            </div>

            <BottomNav
              activeTab={gameTab}
              onTabChange={setGameTab}
              disablePowers={catLocked && isCat}
              canShowMap={true}
              centerAction={isCat && !catLocked ? "scan" : isPrey || capturedPrey ? "qr" : null}
              onCenterAction={() => {
                setErrorBanner(null);
                if (isCat && !catLocked) openScanner();
                else if (isPrey || capturedPrey) setShowQr(true);
              }}
            />

            {/* Overlay d'immobilisation — fond léger, détail dans le HUD */}
            {me?.immobilizedUntil && me.immobilizedUntil > ghostUiNow && (
              <div className="pointer-events-auto fixed inset-0 z-[1900] bg-slate-950/50 backdrop-blur-[2px]" />
            )}

            {/* Desktop tabs (hidden on mobile since dock replaces them) */}
            <div className="hidden shrink-0 border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90 md:flex">
              {tabBtn("map", "Carte", false)}
              {tabBtn("social", "Social")}
              {tabBtn("powers", "Super", catLocked && isCat)}
              {tabBtn("settings", "Réglages")}
            </div>

            {/* Desktop footer actions */}
            <footer className="z-10 hidden shrink-0 gap-2 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:flex">
              {capturedPrey && sessionId && (
                <div className="flex flex-1 items-center gap-4 rounded-[8px] bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  <div className="shrink-0 rounded-[8px] bg-white p-2 dark:bg-slate-900">
                    <QRCodeSVG value={sessionId} size={88} level="M" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Je me suis fait attraper</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Spectateur · montrez encore ce QR au besoin</p>
                  </div>
                </div>
              )}
              {isPrey && (
                <button type="button" onClick={() => setShowQr(true)} className="flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-slate-200 py-4 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Mon QR
                </button>
              )}
              {isCat && !catLocked && (
                <button type="button" onClick={openScanner} className="flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#C45454] py-4 text-base font-semibold text-white transition-colors hover:bg-[#B04A4A]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  Scan capture
                </button>
              )}
            </footer>
          </div>
        </div>

        {showQr && <QRModal sessionId={sessionId} onClose={() => setShowQr(false)} />}
        {showScan ? <ScannerModal onScan={onScanResult} onClose={() => setShowScan(false)} /> : null}
        {showRoleModal && <RoleModal role={role} onClose={() => setShowRoleModal(false)} />}
        {showZoneModal && <ZoneModal
          phaseState={gameState?.zonePhaseState}
          totalPhases={gameState?.totalPhases}
          currentPhase={gameState?.currentPhase}
          currentRadius={gameState?.effectiveGlobalRadiusM}
          nextRadius={gameState?.nextPhaseRadiusM}
          gameStartedAt={gameState?.huntStartedAt}
          timeLimitEndsAt={gameState?.timeLimitEndsAt}
          shrinkZoneEnabled={gameState?.settings?.shrinkZoneEnabled}
          timeLimitEnabled={gameState?.settings?.timeLimitEnabled}
          onClose={() => setShowZoneModal(false)}
        />}
        {showGameModal && <GameModal
          gameStartedAt={gameState?.huntStartedAt}
          timeLimitEndsAt={gameState?.timeLimitEndsAt}
          totalProgress={gameState?.huntStartedAt && gameState?.timeLimitEndsAt ? (getServerTime() - gameState.huntStartedAt) / (gameState.timeLimitEndsAt - gameState.huntStartedAt) : 0}
          gameType={null}
          gameMode={gameState?.settings?.gameMode || null}
          nextBaliseAt={gameState?.nextBaliseAt || null}
          jamLevel={jamLevel}
          onClose={() => setShowGameModal(false)}
        />}
        {showCoinsModal && <CoinsHistoryModal
          coins={me?.coins}
          coinHistory={coinHistory}
          onClose={() => setShowCoinsModal(false)}
        />}
        {showPlayerModal && <PlayerModal
          playerType={role}
          playerName={me?.nickname || 'Joueur'}
          playerStats={{ coins: me?.coins }}
          onClose={() => setShowPlayerModal(false)}
        />}
        {selectedPlayer && gameTab !== "powers" && (
          <PlayerSheet
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            mapFocus={resolvePlayerMapFocus(selectedPlayer.sessionId, {
              gameState,
              position,
              mySessionId: sessionId,
            })}
            onShowOnMap={(mapFocus) =>
              onShowPlayerOnMap(mapFocus, selectedPlayer.sessionId)
            }
            onPowerShortcut={handlePowerShortcut}
            role={role}
            sessionId={sessionId}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  );
}
