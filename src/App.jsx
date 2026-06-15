import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { useGeolocation } from "./hooks/useGeolocation.js";
import { useTheme } from "./context/ThemeContext.jsx";
import GameMap from "./components/game/GameMap.jsx";
import GameSummary from "./components/summary/GameSummary.jsx";
import QRModal from "./components/game/QRModal.jsx";
import ScannerModal from "./components/game/ScannerModal.jsx";
import MapControls from "./components/game/MapControls.jsx";
import CityZonePicker from "./components/game/CityZonePicker.jsx";
import SharePartyModal from "./components/game/SharePartyModal.jsx";
import PowerCard from "./components/powers/PowerCard.jsx";
import { NotificationContainer, useNotifications } from "./components/ui/NotificationSystem.jsx";
import ConfigHint from "./components/ui/ConfigHint.jsx";
import DiscreteSlider from "./components/ui/DiscreteSlider.jsx";
import SliderWithParticles from "./components/ui/SliderWithParticles.jsx";
import AnimatedPrice from "./components/ui/AnimatedPrice.jsx";
import PartyChatPanel from "./components/game/PartyChatPanel.jsx";
import PlayerSheet from "./components/game/PlayerSheet.jsx";
import BottomNav from "./components/ui/BottomNav.jsx";
import CircularLobby from "./components/CircularLobby.jsx";
import CoinFeed from "./components/game/CoinFeed.jsx";
import MapHud from "./components/game/MapHud.jsx";
import CoinsBadge from "./components/game/CoinsBadge.jsx";
import SocialPanel from "./components/game/SocialPanel.jsx";
import AdminPanel from "./components/game/AdminPanel.jsx";
import { ensureSocketReady } from "./lib/backend.js";
import { resolvePlayerMapFocus } from "./lib/resolvePlayerMapFocus.js";
import { playGhostNoiseSound } from "./lib/playGhostNoiseSound.js";

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
  console.log('[saveSession] Called with:', { sessionId, roomCode, nickname });
  try {
    localStorage.setItem(LS_SESSION_KEY, sessionId);
    localStorage.setItem(LS_ROOM_KEY, roomCode);
    localStorage.setItem(LS_NICKNAME_KEY, nickname);
    console.log('[saveSession] Session saved successfully');
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
}

function loadSession() {
  console.log('[loadSession] Called');
  try {
    const sessionId = localStorage.getItem(LS_SESSION_KEY);
    const roomCode = localStorage.getItem(LS_ROOM_KEY);
    const nickname = localStorage.getItem(LS_NICKNAME_KEY);
    console.log('[loadSession] Loaded:', { sessionId, roomCode, nickname });
    if (sessionId && roomCode) {
      return { sessionId, roomCode, nickname: nickname || "Joueur" };
    }
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
  console.log('[loadSession] No session found');
  return null;
}

function clearSession() {
  console.log('[clearSession] Called');
  try {
    localStorage.removeItem(LS_SESSION_KEY);
    localStorage.removeItem(LS_ROOM_KEY);
    localStorage.removeItem(LS_NICKNAME_KEY);
    console.log('[clearSession] Session cleared');
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
}

function saveLastNickname(nickname) {
  console.log('[saveLastNickname] Called with:', { nickname });
  try {
    localStorage.setItem(LS_LAST_NICKNAME_KEY, nickname);
    console.log('[saveLastNickname] Saved');
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
}

function loadLastNickname() {
  console.log('[loadLastNickname] Called');
  try {
    const result = localStorage.getItem(LS_LAST_NICKNAME_KEY) || "";
    console.log('[loadLastNickname] Result:', result);
    return result;
  } catch (e) {
    console.warn("localStorage non disponible:", e);
    return "";
  }
}

function loadLastRoom() {
  console.log('[loadLastRoom] Called');
  try {
    const result = localStorage.getItem(LS_LAST_ROOM_KEY) || "";
    console.log('[loadLastRoom] Result:', result);
    return result;
  } catch (e) {
    console.warn("localStorage non disponible:", e);
    return "";
  }
}

function roleBadgeText(p) {
  console.log('[roleBadgeText] Called with:', { role: p.role, originalRole: p.originalRole, spectator: p.spectator });
  if (p.spectator) return "Spectateur";
  if (p.role === "cat" && p.originalRole === "player") return "Chat (devenu chat)";
  if (p.role === "cat") return "Chat";
  if (p.role === "player" && p.originalRole === "cat") return "Joueur (ex-chat)";
  return "Joueur";
}

function getCodeFromUrl() {
  console.log('[getCodeFromUrl] Called');
  try {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("code") || "";
    console.log('[getCodeFromUrl] Result:', result);
    return result;
  } catch {
    console.log('[getCodeFromUrl] Error parsing URL');
    return "";
  }
}

function getRecapIdFromPath() {
  console.log('[getRecapIdFromPath] Called');
  try {
    const m = window.location.pathname.match(/^\/recap\/([A-Za-z0-9]+)\/?$/);
    const result = m ? m[1].toUpperCase() : null;
    console.log('[getRecapIdFromPath] Result:', result);
    return result;
  } catch {
    console.log('[getRecapIdFromPath] Error parsing path');
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
    description = "Vous avez été déconnecté du serveur.";
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
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        {showSpinner ? (
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
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
          <p className="mb-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Tentative {reconnectAttempt}...
          </p>
        )}
        
        {lastError && (
          <p className="mb-4 text-xs text-red-600 dark:text-red-400">{lastError}</p>
        )}

        <div className="flex flex-col gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={reconnectAttempt > 0}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
            >
              {reason === "session_found" ? "Reprendre" : "Se reconnecter"}
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {reason === "kicked" ? "Ok" : "Quitter"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CatMapLockOverlay({ mapUnlockAt, socket }) {
  const [secLeft, setSecLeft] = useState(0);
  const didRefresh = useRef(false);

  useEffect(() => {
    didRefresh.current = false;
  }, [mapUnlockAt]);

  useEffect(() => {
    if (!mapUnlockAt) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((mapUnlockAt - Date.now()) / 1000));
      setSecLeft(s);
      if (s <= 0 && !didRefresh.current) {
        didRefresh.current = true;
        socket?.emit("refresh_state");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mapUnlockAt, socket]);

  const mm = Math.floor(secLeft / 60);
  const ss = secLeft % 60;

  return (
    <div className="flex h-full flex-col justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          Chat · carte verrouillée
        </p>
        <p className="mt-3 text-center text-5xl font-black tabular-nums text-slate-900 dark:text-white">
          {mm}:{String(ss).padStart(2, "0")}
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
function CatLockCountdownHeader({ mapUnlockAt, socket }) {
  const [secLeft, setSecLeft] = useState(0);
  const didRefresh = useRef(false);

  useEffect(() => {
    didRefresh.current = false;
  }, [mapUnlockAt]);

  useEffect(() => {
    if (!mapUnlockAt) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((mapUnlockAt - Date.now()) / 1000));
      setSecLeft(s);
      if (s <= 0 && !didRefresh.current) {
        didRefresh.current = true;
        socket?.emit("refresh_state");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mapUnlockAt, socket]);

  const mm = Math.floor(secLeft / 60);
  const ss = secLeft % 60;

  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold tabular-nums text-orange-800 ring-1 ring-orange-200 dark:bg-orange-950/80 dark:text-orange-100 dark:ring-orange-800">
      Carte · {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}

// Theme toggle button component
function ThemeToggle({ theme, onToggle, size = "md" }) {
  const sizeClasses = size === "sm" 
    ? "h-9 w-9 text-sm" 
    : "px-3 py-2 text-xs";
  
  const handleClick = (e) => {
    e.stopPropagation();
    onToggle();
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${sizeClasses}`}
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
    >
      {theme === "dark" ? (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
      {size !== "sm" && (theme === "dark" ? "Clair" : "Sombre")}
    </button>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { notifications, addNotification, removeNotification } = useNotifications();
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
  const [mapBasemap, setMapBasemap] = useState("osm");

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
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectError, setReconnectError] = useState(null);
  const [reconnectReason, setReconnectReason] = useState(null);
  const [midJoinWait, setMidJoinWait] = useState(null);
  const [joinRequestQueue, setJoinRequestQueue] = useState([]);
  const [partyChatMessages, setPartyChatMessages] = useState([]);
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
  const lastPingRef = useRef(Date.now());
  const socketRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  sessionIdRef.current = sessionId;
  isHostRef.current = isHost;

  // Tick pour les overlays liés au bruit (timer barre de progression)
  useEffect(() => {
    if (!activeNoise) return;
    const id = setInterval(() => {
      setNoiseUiNow(Date.now());
      const elapsed = Date.now() - activeNoise.startedAt;
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
    const id = setInterval(() => setReconnectUiNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [isReconnecting]);

  // Tick pour les barres de temps (ghost)
  useEffect(() => {
    const id = setInterval(() => setGhostUiNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Global audio unlock on user interaction (required for iOS)
  useEffect(() => {
    const unlockAudio = () => {
      if (sharedAudioContextRef.current && sharedAudioContextRef.current.state === 'suspended') {
        sharedAudioContextRef.current.resume();
        console.log('[Global unlock] AudioContext resumed');
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

  /** Carte tuiles : suit le thème clair / sombre pendant la partie */
  useEffect(() => {
    if (stage !== "game") return;
    setMapBasemap(theme === "dark" ? "dark" : "light");
  }, [theme, stage]);

  const geoEnabled =
    stage === "lobby" || stage === "role_reveal" || stage === "game";
  const { position, error: geoError } = useGeolocation(geoEnabled);
  const lastEmit = useRef(0);

  const resetToEntry = useCallback((clearStorage = true) => {
    console.log('[resetToEntry] Called with:', { clearStorage });
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
    console.log('[resetToEntry] Reset complete');
  }, []);

  // Reconnection logic - ensures socket is connected then restores session
  const attemptReconnect = useCallback((s, attempt = 1) => {
    const saved = loadSession();
    if (!saved) {
      setIsReconnecting(false);
      setReconnectReason(null);
      return;
    }

    const tryRestore = () => {
      setReconnectAttempt(attempt);
      s.emit(
        "reconnect_session",
        { sessionId: saved.sessionId, roomCode: saved.roomCode },
        (res) => {
          if (res?.ok) {
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

            if (res.phase === "lobby" && res.lobby) {
              setLobby(res.lobby);
              if (res.lobby.partyChat) setPartyChatMessages(res.lobby.partyChat);
              setStage("lobby");
            } else if (res.phase === "role_reveal" && res.rolesReveal) {
              setRolesReveal(res.rolesReveal);
              if (res.rolesReveal.partyChat) setPartyChatMessages(res.rolesReveal.partyChat);
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

          setReconnectError(res?.error || "Échec de reconnexion");

          if (
            res?.error?.includes("expir") ||
            res?.error?.includes("n'existe plus") ||
            res?.error?.includes("n'existe") ||
            res?.error?.includes("termin")
          ) {
            clearSession();
            setIsReconnecting(false);
            setReconnectReason(null);
            resetToEntry(false);
            return;
          }

          if (attempt < 6) {
            const delay = Math.min(8000, 1000 * attempt);
            reconnectRetryRef.current = setTimeout(() => {
              attemptReconnect(s, attempt + 1);
            }, delay);
          } else {
            setReconnectAttempt(0);
          }
        }
      );
    };

    if (!s?.connected) {
      setIsReconnecting(true);
      setReconnectReason("lost_connection");
      ensureSocketReady(s)
        .then(() => tryRestore())
        .catch(() => {
          if (attempt < 6) {
            const delay = Math.min(8000, 1000 * attempt);
            reconnectRetryRef.current = setTimeout(() => {
              attemptReconnect(s, attempt + 1);
            }, delay);
          }
        });
      return;
    }

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
      lastPingRef.current = Date.now();
      const saved = loadSession();
      if (saved) {
        setIsReconnecting(true);
        setReconnectReason("lost_connection");
        setReconnectError(null);
        attemptReconnect(s);
      }
    });

    s.on("disconnect", () => {
      setConnected(false);
      if (stageRef.current === "lobby" || stageRef.current === "role_reveal" || stageRef.current === "game") {
        setIsReconnecting(true);
        setReconnectReason("lost_connection");
        setReconnectError(null);
        attemptReconnect(s);
      }
    });

    s.on("server_ping", ({ t }) => {
      lastPingRef.current = Date.now();
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
      setRolesReveal(payload);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
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
    });

    s.on("game_finished", (data) => {
      clearSession();
      setSummary(data);
      setStage("summary");
      setGameState(null);
    });

    s.on("capture_ok", (data) => {
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

          console.log('[player_out_of_bounds] Pulsing sound playing, AudioContext state:', audioCtx.state);
        } catch (e) {
          console.warn("AudioContext non disponible ou bloque", e);
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
            console.warn("Error stopping audio", e);
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
        console.warn("AudioContext non disponible pour bruit", e);
      });

      setActiveNoise({
        startedAt: Date.now(),
        durationSec: Math.max(1, durationSec || 1),
        volume,
        by: by || "un adversaire",
      });
    });

    s.on("immobilized", ({ until, by, durationSec }) => {
      // L'overlay d'immobilisation est déjà géré côté UI via me.immobilizedUntil ;
      // pas de notification toast supplémentaire ici pour garder un impact visuel fort.
    });

    s.on("admin_role_changed", (data) => {
      addNotification(`Role mis a jour : ${data.nickname} -> ${data.role}`, "info");
    });

    s.on("player_left", (data) => {
      addNotification(`${data.nickname} a quitte la partie`, "player_left");
    });

    s.on("player_joined", (data) => {
      addNotification(`${data.nickname} a rejoint la partie`, "player_joined");
    });

    s.on("player_disconnected", (data) => {
      addNotification(`${data.nickname} s'est deconnecte`, "warning");
    });

    s.on("player_reconnected", (data) => {
      addNotification(`${data.nickname} s'est reconnecte`, "success");
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
      addNotification(`${data.nickname} demande à rejoindre la partie`, "info", 12000);
    });

    s.on("join_request_denied", (data) => {
      setMidJoinWait(null);
      addNotification(data?.message || "Demande refusée par l'hôte.", "warning");
    });

    s.on("join_request_accepted", (payload) => {
      const nick = lastNicknameRef.current || nickname.trim() || "Joueur";
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
        setStage("role_reveal");
      } else if (payload.phase === "playing") {
        setStage("game");
      } else {
        setStage("lobby");
      }
      s.emit("refresh_state");
      addNotification("Vous avez rejoint la partie.", "success");
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
      if (s.connected && Date.now() - lastPingRef.current > 180000) {
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
    if (!isHost && gameTab === "admin") setGameTab("map");
  }, [isHost, gameTab]);

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
    if (!socket || !position) return;
    const now = Date.now();
    if (now - lastEmit.current < 800) return;
    lastEmit.current = now;
    socket.emit("position", { lat: position.lat, lng: position.lng });
  }, [socket, position]);

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
    console.log('[unlockAudioAndVibration] Called');
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
      console.log('[unlockAudioAndVibration] Audio unlocked, state:', audioCtx.state);
    } catch(e) {
      console.log('[unlockAudioAndVibration] Audio unlock failed:', e);
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(1); } catch(e) {}
      console.log('[unlockAudioAndVibration] Vibration unlocked');
    }
  }, []);

  const onCreate = useCallback(async () => {
    if (!socket || !nickname.trim()) {
      setErrorBanner("Choisissez un pseudo.");
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
      if (window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      saveSession(res.sessionId, res.code, trimmedNickname);
      setSessionId(res.sessionId);
      setIsHost(true);
      setLobby(res.lobby);
      setStage("lobby");
    });
  }, [socket, nickname]);

  const respondJoinRequest = useCallback(
    (requestId, accept) => {
      console.log('[respondJoinRequest] Called with:', { requestId, accept });
      if (!socket) {
        console.log('[respondJoinRequest] No socket');
        return;
      }
      socket.emit("respond_join_request", { requestId, accept }, (res) => {
        console.log('[respondJoinRequest] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Action impossible.");
        setJoinRequestQueue((q) => q.filter((x) => x.requestId !== requestId));
      });
    },
    [socket]
  );

  const onJoin = useCallback(async () => {
    if (!socket || !nickname.trim() || !roomCodeInput.trim()) {
      setErrorBanner("Pseudo et code requis.");
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
          if (window.history.replaceState) {
            window.history.replaceState({}, "", window.location.pathname);
          }
          saveSession(res.sessionId, res.code, trimmedNickname);
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
                addNotification("Demande envoyée à l'hôte.", "success");
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
      console.log('[pushSettings] Called with:', partial);
      if (!socket) {
        console.log('[pushSettings] No socket');
        return;
      }
      socket.emit("update_settings", partial, (res) => {
        console.log('[pushSettings] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Mise a jour refusee.");
        else if (res.lobby) setLobby(res.lobby);
      });
    },
    [socket]
  );

  const onRevealRoles = useCallback(() => {
    console.log('[onRevealRoles] Called');
    if (!socket) {
      console.log('[onRevealRoles] No socket');
      return;
    }
    socket.emit("start_roles", {}, (res) => {
      console.log('[onRevealRoles] Response:', res);
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de reveler les roles.");
    });
  }, [socket]);

  const adminAddTime = useCallback(
    (minutes) => {
      console.log('[adminAddTime] Called with:', minutes);
      if (!socket) {
        console.log('[adminAddTime] No socket');
        return;
      }
      const m = Math.max(1, Math.floor(Number(minutes) || 0));
      socket.emit("admin_add_time", { minutes: m }, (res) => {
        console.log('[adminAddTime] Response:', res);
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

  const onBeginHunt = useCallback(() => {
    console.log('[onBeginHunt] Called');
    if (!socket) {
      console.log('[onBeginHunt] No socket');
      return;
    }
    socket.emit("begin_hunt", {}, (res) => {
      console.log('[onBeginHunt] Response:', res);
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de demarrer la chasse.");
    });
  }, [socket]);

  const onScanResult = useCallback(
    (text) => {
      console.log('[onScanResult] Called with:', { text });
      if (!socket || !text) {
        console.log('[onScanResult] No socket or text');
        return;
      }
      const id = String(text).trim();
      socket.emit("capture_scan", { targetSessionId: id }, (res) => {
        console.log('[onScanResult] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Capture refusee.");
        else setShowScan(false);
      });
    },
    [socket]
  );

  const adminKick = useCallback(
    (targetSessionId) => {
      console.log('[adminKick] Called with:', { targetSessionId });
      if (!socket) {
        console.log('[adminKick] No socket');
        return;
      }
      socket.emit("admin_kick", { targetSessionId }, (res) => {
        console.log('[adminKick] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Expulsion refusee.");
      });
    },
    [socket]
  );

  const adminSetRole = useCallback(
    (targetSessionId, r) => {
      console.log('[adminSetRole] Called with:', { targetSessionId, role: r });
      if (!socket) {
        console.log('[adminSetRole] No socket');
        return;
      }
      socket.emit("admin_set_role", { targetSessionId, role: r }, (res) => {
        console.log('[adminSetRole] Response:', res);
        if (!res?.ok) setErrorBanner(res?.error || "Changement refuse.");
      });
    },
    [socket]
  );

  const adminEndGame = useCallback(() => {
    console.log('[adminEndGame] Called');
    if (!socket) {
      console.log('[adminEndGame] No socket');
      return;
    }
    socket.emit("admin_end_game", {}, (res) => {
      console.log('[adminEndGame] Response:', res);
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de terminer.");
      else setGameTab("map");
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
        console.warn("localStorage non disponible:", e);
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
        if (!res?.ok) setErrorBanner(res?.error || "Message refuse.");
      });
    },
    [socket]
  );

  const roleLabel = useMemo(() => {
    if (role === "cat") return "Chat";
    if (role === "player") return "Joueur";
    return "";
  }, [role]);

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
        if (isInvisible) {
          addNotification(`${p.nickname} passe en mode ghost 👻`, "game_info");
        } else {
          addNotification(`${p.nickname} redevient visible`, "game_info");
        }
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
    fetch(`/api/recap/${recapSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (alive) {
          setRecapData(d);
          setRecapLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setRecapErr(true);
          setRecapLoading(false);
        }
      });
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
        if (reconnectReason === "kicked") {
          setIsReconnecting(false);
          setReconnectReason(null);
          resetToEntry();
        } else {
          leaveGame();
        }
      }}
    />
  );

  if (recapSlug && recapLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-50 p-8 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
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
          className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white"
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
      <div className="flex min-h-full flex-col bg-slate-50 p-4 pb-8 dark:bg-slate-950">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        
        <header className="mb-6 flex items-start justify-between gap-3 pt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Chase GPS
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Les <strong className="text-slate-800 dark:text-slate-200">chats</strong> traquent les{" "}
              <strong className="text-slate-800 dark:text-slate-200">joueurs</strong> sur une carte.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {connected ? "Connecte" : "Connexion..."}
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        {errorBanner && (
          <div className="mb-4 rounded-xl bg-red-100 p-3 text-sm text-red-900 ring-1 ring-red-200 dark:bg-red-950/80 dark:text-red-100 dark:ring-red-900">
            {errorBanner}
          </div>
        )}

        {rejoinCandidate && connected && !isReconnecting && !resumeCandidate && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
                Partie précédente
              </h3>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Voulez-vous rejoindre la salle <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{rejoinCandidate.roomCode}</span> avec le pseudo <span className="font-semibold text-slate-900 dark:text-white">{rejoinCandidate.nickname}</span> ?
              </p>
              <div className="flex flex-col gap-2">
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

                    socket.emit(
                      "join_room",
                      { 
                        code: trimmedRoomCode, 
                        nickname: trimmedNickname,
                        sessionId: existingSessionId 
                      },
                      (res) => {
                        setEntryBusyKind(null);
                        if (res?.ok) {
                          if (window.history.replaceState) {
                            window.history.replaceState({}, "", window.location.pathname);
                          }
                          saveSession(res.sessionId, res.code, trimmedNickname);
                          setSessionId(res.sessionId);
                          setIsHost(res.isHost);
                          
                          if (res.phase === "lobby" && res.lobby) {
                            setLobby(res.lobby);
                            setStage("lobby");
                          } else if (res.phase === "role_reveal" && res.rolesReveal) {
                            setRolesReveal(res.rolesReveal);
                            setStage("role_reveal");
                          } else if (res.phase === "playing" && res.gameState) {
                            setGameState(res.gameState);
                            setRole(res.gameState.me?.role ?? null);
                            setStage("game");
                          } else if (res.lobby) {
                            // Fallback for normal join
                            setLobby(res.lobby);
                            setStage("lobby");
                          }
                          
                          setRejoinCandidate(null);
                          return;
                        }
                        setErrorBanner(res?.error || "Impossible de rejoindre.");
                        setRejoinCandidate(null);
                      }
                    );
                  }}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none"
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
                      console.warn("localStorage non disponible:", e);
                    }
                    setRejoinCandidate(null);
                  }}
                  className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  Non, ignorer
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="mx-auto w-full max-w-md space-y-4 rounded-3xl bg-gradient-to-br from-white via-[#FFF5D7]/30 to-[#FDECF4]/40 p-5 shadow-lg ring-1 ring-amber-100/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:ring-slate-700"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !entryBusyKind) {
              e.preventDefault();
              if (entryMode === "create") onCreate();
              else onJoin();
            }
          }}
        >
        <div className="mb-2 flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setEntryMode("create");
              setErrorBanner(null);
              setNicknameError(null);
            }}
            disabled={Boolean(entryBusyKind)}
            className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
              entryMode === "create"
                ? "bg-white text-indigo-700 shadow dark:bg-slate-900 dark:text-indigo-300"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Creer une partie
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode("join");
              setErrorBanner(null);
              setNicknameError(null);
            }}
            disabled={Boolean(entryBusyKind)}
            className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
              entryMode === "join"
                ? "bg-white text-indigo-700 shadow dark:bg-slate-900 dark:text-indigo-300"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Rejoindre
          </button>
        </div>

        <label className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Pseudo
        </label>
        <input
          className={`mb-2 w-full rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:ring-2 dark:bg-slate-900 dark:text-white ${
            nicknameError
              ? "border-orange-300 ring-orange-500 dark:border-orange-700 dark:ring-orange-400"
              : "border-slate-300 ring-indigo-500 dark:border-slate-700"
          }`}
          placeholder="Votre nom"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setNicknameError(null);
          }}
          maxLength={24}
          autoComplete="nickname"
          disabled={Boolean(entryBusyKind)}
        />
        {nicknameError && (
          <p className="mb-4 text-sm text-orange-600 dark:text-orange-400">
            {nicknameError}
          </p>
        )}

        {entryMode === "join" && (
          <>
            <label className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Code de la salle
            </label>
            <input
              className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="ex: AZERT"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              disabled={Boolean(entryBusyKind)}
            />
          </>
        )}

        {entryMode === "create" ? (
          <button
            type="button"
            onClick={onCreate}
            disabled={Boolean(entryBusyKind)}
            className="w-full rounded-2xl bg-gradient-to-r from-[#60A5FA] to-[#2563EB] py-4 text-base font-bold text-white shadow-lg"
          >
            {entryBusyKind === "create" ? "Réveil du serveur…" : "Creer ma partie"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={Boolean(entryBusyKind)}
            className="w-full rounded-2xl bg-gradient-to-r from-[#34D399] to-[#10B981] py-4 text-base font-bold text-white shadow-lg"
          >
            {entryBusyKind === "join" ? "Réveil du serveur…" : "Rejoindre la partie"}
          </button>
        )}

        {entryBusyKind && (
          <button
            type="button"
            onClick={() => {
              entryReqRef.current += 1;
              setEntryBusyKind(null);
            }}
            className="w-full rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            Annuler
          </button>
        )}
        </div>

        {/* Game history section */}
        {midJoinWait && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <p className="text-center text-sm font-semibold text-slate-900 dark:text-white">
              En attente · salle{" "}
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {midJoinWait.code}
              </span>
            </p>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              L’hôte doit accepter votre demande.
            </p>
            <button
              type="button"
              onClick={() => setMidJoinWait(null)}
              className="mt-4 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    );
  }

  // Lobby screen
  if (stage === "lobby" && lobby) {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100/90 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:max-w-none">
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Salle</p>
            <p className="font-mono text-3xl font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              {lobby.code}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {isHost ? "Vous êtes l’hôte" : "En attente de l’hôte"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowShareParty(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
            >
              Partager
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {showShareParty && lobby?.code && (
          <SharePartyModal
            code={lobby.code}
            title="Inviter à cette salle"
            onClose={() => setShowShareParty(false)}
          />
        )}

        {errorBanner && (
          <div className="mb-3 rounded-xl bg-red-100 p-3 text-sm text-red-900 dark:bg-red-950/80 dark:text-red-100">
            {errorBanner}
          </div>
        )}

        {joinRequestQueue.length > 0 && (
          <div className="mb-3 space-y-2">
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
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    onClick={() => respondJoinRequest(j.requestId, true)}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
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
          <div className="mb-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/80 dark:text-amber-100">
            {geoError.message}
          </div>
        )}

        {!geoError && !position && (
          <div className="mb-3 rounded-xl bg-slate-200 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Recherche du signal GPS... Autorisez la position.
          </div>
        )}

        <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-700">
          <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200 text-center">
            Joueurs ({lobby.players?.length ?? 0})
          </h2>
          <CircularLobby 
            players={lobby.players || []} 
            hostSessionId={lobby.hostSessionId || sessionId}
            currentSessionId={sessionId}
          />
        </div>

        {isHost && (
          <div className="space-y-5 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-700">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Configuration de la partie
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Règles visibles par tous une fois la chasse lancée. La discussion reste à droite (ordinateur) ou derrière le bouton bulle (téléphone).
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Rayon zone (m) : {settings.globalRadiusM}
              </label>
              <SliderWithParticles
                type="range"
                min={100}
                max={2000}
                step={50}
                value={settings.globalRadiusM}
                onChange={(e) =>
                  pushSettings({ globalRadiusM: Number(e.target.value) })
                }
                className="mt-1 w-full accent-matte-blue"
              />
              <ConfigHint>
                Taille du terrain autorisé autour du centre de partie. Hors de ce cercle, le jeu peut pénaliser ou masquer les positions.
              </ConfigHint>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Rayon brouillage (m) : {settings.jamRadiusM}
              </label>
              <SliderWithParticles
                type="range"
                min={20}
                max={200}
                step={5}
                value={settings.jamRadiusM}
                onChange={(e) =>
                  pushSettings({ jamRadiusM: Number(e.target.value) })
                }
                className="mt-1 w-full accent-matte-blue"
              />
              <ConfigHint>
                Autour de chaque joueur, une zone où la position des autres est volontairement imprécise pour les chats.
              </ConfigHint>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Délai carte chats (min) : {settings.catDelayMinutes ?? 5}
              </label>
              <SliderWithParticles
                type="range"
                min={0}
                max={30}
                step={1}
                value={settings.catDelayMinutes ?? 5}
                onChange={(e) =>
                  pushSettings({ catDelayMinutes: Number(e.target.value) })
                }
                className="mt-1 w-full accent-primary-blue"
              />
              <ConfigHint>
                Au début de la chasse, les chats ne voient pas tout de suite la carte complète : ce délai laisse aux joueurs le temps de s'éloigner.
              </ConfigHint>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Nombre de chats : {settings.catCount}
              </label>
              <input
                type="range"
                min={1}
                max={Math.max(1, (lobby.players?.length || 2) - 1)}
                step={1}
                value={Math.min(
                  settings.catCount,
                  Math.max(1, (lobby.players?.length || 2) - 1)
                )}
                onChange={(e) =>
                  pushSettings({ catCount: Number(e.target.value) })
                }
                className="mt-1 w-full accent-matte-blue"
              />
              <ConfigHint>
                Combien de participants seront désignés comme chats (traqueurs) pour attraper les autres.
              </ConfigHint>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-600 dark:bg-slate-800/80">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Attribution des chats
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => pushSettings({ catAssignmentMode: "random" })}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    (settings.catAssignmentMode || "random") === "random"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                  }`}
                >
                  Tirage aléatoire
                </button>
                <button
                  type="button"
                  onClick={() => pushSettings({ catAssignmentMode: "manual" })}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    settings.catAssignmentMode === "manual"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                  }`}
                >
                  Choix par l&apos;hôte
                </button>
              </div>
              <ConfigHint>
                Aléatoire : le jeu tire les chats au hasard. Manuel : vous choisissez qui est chat ou joueur sur chaque ligne (sauf vous-même), puis vous lancez la chasse quand le nombre de chats correspond au curseur ci-dessus.
              </ConfigHint>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-600 dark:bg-slate-800/80">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Mode de partie
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={(lobby.players?.length || 0) <= 2}
                  onClick={() => pushSettings({ gameMode: "infection" })}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    (lobby.players?.length || 0) <= 2
                      ? "cursor-not-allowed bg-slate-200 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700"
                      : (settings.gameMode || "tag_swap") === "infection"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                  }`}
                >
                  Chats cumulés
                </button>
                <button
                  type="button"
                  onClick={() => pushSettings({ gameMode: "tag_swap" })}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    settings.gameMode === "tag_swap"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600"
                  }`}
                >
                  Chat tournant
                </button>
              </div>
              <ConfigHint>
                Chats cumulés : disponible à partir de 3 joueurs, les joueurs attrapés rejoignent les chats et le dernier joueur gagne. Chat tournant : le chat échange son rôle avec le joueur attrapé, et le gagnant est celui qui passe le moins de temps chat.
              </ConfigHint>
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Options avancées
              </p>
                <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${settings.timeLimitEnabled ? "cursor-pointer border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80" : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60 dark:border-slate-700 dark:bg-slate-900/40"}`}>
                  <span className="text-sm text-slate-800 dark:text-slate-100">
                    Zone globale qui rétrécit
                  </span>
                  <input
                    type="checkbox"
                    checked={!!settings.shrinkZoneEnabled && !!settings.timeLimitEnabled}
                    disabled={!settings.timeLimitEnabled}
                    onChange={(e) =>
                      pushSettings({ shrinkZoneEnabled: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 disabled:opacity-50 dark:border-slate-500"
                  />
                </label>
                <ConfigHint>
                  Le cercle autorisé se resserre vers une ou plusieurs zones finales pour terminer la partie.
                </ConfigHint>
                {settings.shrinkZoneEnabled && (
                  <div className="mt-2 space-y-2 pl-1 text-xs text-orange-600 dark:text-orange-400">
                    Les zones se réduiront automatiquement en fonction du temps limite défini pour la partie.
                  </div>
                )}

                <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/80">
                  <span className="text-sm text-slate-800 dark:text-slate-100">
                    Limite de durée
                  </span>
                  <input
                    type="checkbox"
                    checked={!!settings.timeLimitEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      const patch = { timeLimitEnabled: enabled };
                      if (!enabled && settings.shrinkZoneEnabled) {
                        patch.shrinkZoneEnabled = false;
                      }
                      pushSettings(patch);
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 dark:border-slate-500"
                  />
                </label>
                <ConfigHint>
                  La partie s’arrête automatiquement quand le compte à rebours atteint zéro, avec récapitulatif pour tout le monde.
                </ConfigHint>
                {settings.timeLimitEnabled && (
                  <div className="mt-2 pl-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Minutes max : {settings.timeLimitMinutes ?? 30}
                    </label>
                    <SliderWithParticles
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={settings.timeLimitMinutes ?? 30}
                      onChange={(e) =>
                        pushSettings({
                          timeLimitMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full accent-matte-blue"
                    />
                  </div>
                )}
              </div>
          </div>
        )}

        {isHost && (
          <button
            type="button"
            onClick={onRevealRoles}
            disabled={!lobby.canStartGps || !lobby.canRevealRoles}
            className="mt-auto w-full rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-700 active:bg-emerald-800"
          >
            Reveler les roles
          </button>
        )}
        {isHost && !lobby.canRevealRoles && (
          <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
            Il faut au moins 2 joueurs dans la salle pour lancer la partie.
          </p>
        )}
        {isHost && lobby.canRevealRoles && !lobby.canStartGps && (
          <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
            Au moins une position GPS est necessaire pour le centre de la zone.
          </p>
        )}
        {!isHost && (
          <button
            type="button"
            onClick={leaveGame}
            className="mt-4 w-full rounded-[8px] border border-slate-300 py-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400"
          >
            Quitter la partie
          </button>
        )}
          </main>
        </div>
      </div>
    );
  }

  // Role reveal screen
  if (stage === "role_reveal" && rolesReveal) {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-950 dark:to-slate-900">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}

        {showShareParty && rolesReveal.code && (
          <SharePartyModal
            code={rolesReveal.code}
            title="Inviter à cette partie"
            onClose={() => setShowShareParty(false)}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avant la chasse</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              {rolesReveal.code}
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Attribution des rôles
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Chaque participant voit son camp. En mode manuel, l&apos;hôte règle les autres joueurs uniquement — pas sa propre ligne.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowShareParty(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Partager
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

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
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    onClick={() => respondJoinRequest(j.requestId, true)}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    onClick={() => respondJoinRequest(j.requestId, false)}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(rolesReveal?.settings?.catAssignmentMode || "random") === "manual" && isHost && (
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/90 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
            <p className="font-semibold">Mode manuel (hôte)</p>
            <p className="mt-1 text-xs leading-relaxed">
              Pour chaque autre joueur, appuyez une fois sur <strong>Chat</strong> ou <strong>Joueur</strong> jusqu&apos;à obtenir exactement{" "}
              {rolesReveal?.settings?.catCount ?? 1} chat(s), puis lancez la chasse.
            </p>
          </div>
        )}

        <ul className="space-y-3 pb-2">
          {rolesReveal.players?.map((p) => (
            <li
              key={p.sessionId}
              className={`rounded-2xl p-4 shadow-sm ring-1 ${
                p.sessionId === sessionId
                  ? "bg-indigo-50/90 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-800"
                  : "bg-white/90 ring-slate-200/90 dark:bg-slate-900/80 dark:ring-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {p.nickname}
                  {p.sessionId === sessionId ? (
                    <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">vous</span>
                  ) : null}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    p.role === "cat"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200"
                      : "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200"
                  }`}
                >
                  {p.role === "cat" ? "Chat" : "Joueur"}
                </span>
              </div>
              {p.sessionId === sessionId && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  {p.role === "cat"
                    ? "Vous traquez les joueurs sur la carte et validez les captures au scanner."
                    : "Vous fuyez, partagez la discussion si besoin, et montrez votre QR à un chat pour être capturé."}
                </p>
              )}
              {isHost && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.98] dark:bg-orange-600 dark:hover:bg-orange-500"
                      onClick={() => adminSetRole(p.sessionId, "cat")}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 active:scale-[0.98] dark:bg-sky-600 dark:hover:bg-sky-500"
                      onClick={() => adminSetRole(p.sessionId, "player")}
                    >
                      Joueur
                    </button>
                  </div>
                  <ConfigHint>
                    Affecte ce participant comme chat ou comme joueur.
                  </ConfigHint>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-red-200 bg-red-50/90 py-2.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                    onClick={() => adminKick(p.sessionId)}
                  >
                    Expulser de la salle
                  </button>
                  <ConfigHint>
                    Déconnecte immédiatement cette personne de la partie (utile en cas d&apos;abus ou de mauvais pseudo).
                  </ConfigHint>
                </div>
              )}
            </li>
          ))}
        </ul>

        {isHost ? (
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="particle-orbit-container">
                <div className="absolute h-2 w-2 rounded-full bg-[#E2C96D]" style={{transform: 'translateX(40px)'}} />
              </div>
              <div className="particle-orbit-container" style={{animationDelay: '-1.3s'}}>
                <div className="absolute h-1.5 w-1.5 rounded-full bg-[#E2C96D]" style={{transform: 'translateX(36px)'}} />
              </div>
              <div className="particle-orbit-container" style={{animationDelay: '-2.6s'}}>
                <div className="absolute h-1 w-1 rounded-full bg-[#E2C96D]" style={{transform: 'translateX(44px)'}} />
              </div>
            </div>
            <button
              type="button"
              onClick={onBeginHunt}
              disabled={(rolesReveal?.players?.length ?? 0) < 2}
              className="relative z-10 w-full rounded-[8px] bg-[#5B7FA5] py-4 text-base font-semibold text-white shadow-md transition disabled:opacity-40"
            >
              Démarrer la chasse
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            En attente du démarrage par l&apos;hôte…
          </p>
        )}
        {!isHost && (
          <button
            type="button"
            onClick={leaveGame}
            className="mt-4 w-full rounded-[8px] border border-slate-300 py-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400"
          >
            Quitter la partie
          </button>
        )}
          </main>
        </div>
      </div>
    );
  }

  if (stage === "game" && !gameState) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 dark:bg-slate-950">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
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
    const jamBase = Number(gameState.jamRadiusBaseM || gameState.settings?.jamRadiusM || 80);
    const jamScale = Number(gameState.jamRadiusScale || 1);
    const jamRadius = jamBase * jamScale;
    let jamLabel = "Normal";
    let jamLevel = "normal"; // small | normal | large
    if (jamScale < 0.99) {
      jamLabel = "Rétréci";
      jamLevel = "small";
    } else if (jamScale > 1.01) {
      jamLabel = "Agrandit";
      jamLevel = "large";
    }

    const jamIsMin = jamScale <= 0.51; // proche du palier min côté serveur (0.5)
    const jamIsMax = jamScale >= 1.49; // proche du palier max côté serveur (1.5)

    // Effet de pouvoir actif pour l'extension du HUD
    let hudPowerEffect = null;
    let hudPowerUiNow = Date.now();
    if (activeNoise) {
      const elapsed = Date.now() - activeNoise.startedAt;
      if (elapsed <= activeNoise.durationSec * 1000) {
        hudPowerEffect = { kind: "noise", ...activeNoise };
        hudPowerUiNow = noiseUiNow;
      }
    } else if (me?.invisUntil && me.invisUntil > ghostUiNow && me?.invisSince) {
      hudPowerEffect = {
        kind: "ghost",
        invisUntil: me.invisUntil,
        invisSince: me.invisSince,
      };
      hudPowerUiNow = ghostUiNow;
    } else if (me?.immobilizedUntil && me.immobilizedUntil > ghostUiNow) {
      hudPowerEffect = { kind: "immobilized", until: me.immobilizedUntil };
      hudPowerUiNow = ghostUiNow;
    } else if (jamLevel !== "normal") {
      hudPowerEffect = {
        kind: "jam",
        label: jamLabel,
        radiusM: jamRadius,
      };
    }

    const isCooldown = (key) => (localCooldowns?.[key] || 0) > Date.now();
    const cooldownUntil = (key) => localCooldowns?.[key] || 0;
    const setCd = (key, secs) => setLocalCooldowns((m) => ({ ...m, [key]: Date.now() + secs * 1000 }));

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

    const renderAdminPanel = () => (
      <AdminPanel
        roomCode={currentRoomCode}
        rosterList={rosterList}
        sessionId={sessionId}
        onEndGame={() => {
          if (window.confirm("Terminer la partie pour tout le monde et afficher le récapitulatif ?")) {
            adminEndGame();
          }
        }}
        onAddTime={adminAddTime}
        onAdjustCoins={(targetSessionId, delta, nickname) => {
          socket?.emit("admin_adjust_coins", { targetSessionId, delta }, (res) => {
            if (res?.ok) addNotification(`${delta > 0 ? "+" : ""}${delta} pièces pour ${nickname}`, "success");
            else addNotification(res?.error || "Action refusée", "error");
          });
        }}
        onSetRole={adminSetRole}
        onKick={adminKick}
        onLeave={leaveGame}
      />
    );

    const tabBtn = (id, label, disabled = false, variant = "top") => {
      const active = gameTab === id && !disabled;
      const base =
        "flex-1 py-3 text-sm font-semibold transition-colors md:py-2.5 disabled:opacity-40";
      const topCls = active
        ? "border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-300"
        : "border-b-2 border-transparent text-slate-500";
      const bottomCls = active
        ? "text-indigo-700 dark:text-indigo-200"
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
      <div className="flex h-full min-h-0 flex-col bg-[#FAFAFA] dark:bg-slate-950">
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
            <div className="relative min-h-0 flex-1 bg-slate-200 dark:bg-slate-900">
              {gameTab === "social" && (
                <div className="h-full overflow-auto pt-[7.5rem] md:pt-0">
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
              )}

              {gameTab === "powers" && (
                <div className="h-full overflow-auto p-4 pb-24">
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
                      details={<>
                        Devenez invisible pendant un certain temps. Le coût dépend de la <b>durée</b> et du <b>nombre de cibles</b>.
                        <br />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Coût estimé actuel : ~{estimatedInvisCost} pièces.</span>
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
                            addNotification("Invisibilité activée", "success");
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
                          <div className="flex bg-slate-100 p-0.5 rounded-full dark:bg-slate-800">
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                                invisScope === "self"
                                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                              onClick={() => setInvisScope("self")}
                            >
                              Moi
                            </button>
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                                invisScope === "single"
                                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                              onClick={() => setInvisScope("single")}
                            >
                              Cible
                            </button>
                          </div>
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
                                          ? "bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-500/30 shadow-inner" 
                                          : "bg-slate-50 border border-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <span className={`truncate font-semibold ${checked ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-200"}`}>
                                        {p.nickname}
                                      </span>
                                      {checked && <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />}
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
                            color="indigo"
                          />
                        </div>
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
                              addNotification("Bruit déclenché", "success");
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
                          <div className="flex bg-slate-100 p-0.5 rounded-full dark:bg-slate-800">
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                                noiseTargetMode === "all"
                                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                              onClick={() => setNoiseTargetMode("all")}
                            >
                              Tous
                            </button>
                            <button
                              type="button"
                              className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                                noiseTargetMode === "single"
                                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                              onClick={() => setNoiseTargetMode("single")}
                            >
                              Choix
                            </button>
                          </div>
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
                          title="Agrandir le cercle de brouillage"
                          emoji="📡"
                          gradient={["#10B981", "#34D399"]}
                          costText={`${powerCosts.zone_morph_player}`}
                          locked={jamIsMax}
                          lockReason={jamIsMax ? "Déjà au plus grand" : ""}
                          details={<>
                            Agrandit le cercle de brouillage des joueurs. Si les chats l'ont réduit au maximum, vous pouvez le ramener directement à l'extrême opposé si vous avez assez de pièces.
                          </>}
                          onUse={() => {
                            if (jamIsMax) return; // évite d'envoyer une requête inutile
                            socket?.emit("use_power", { kind: "zone_morph" }, (res) => {
                              if (res?.ok) {
                                addNotification("Cercle de brouillage ajusté", "success");
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

                        <PowerCard
                          title="Immobiliser un joueur"
                          emoji="🧊"
                          stars={3}
                          gradient={["#3B82F6", "#60A5FA"]}
                          locked={isCooldown("freeze_cats")}
                          lockReason="Recharge"
                          lockUntil={cooldownUntil("freeze_cats")}
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
                                addNotification("Joueurs immobilisés", "success");
                              } else {
                                addNotification(res?.error || "Erreur", "error");
                              }
                            });
                          }}
                        >
                          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">Cibles :</span>
                              <div className="flex bg-slate-100 p-0.5 rounded-full dark:bg-slate-800">
                                <button
                                  type="button"
                                  className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                                    freezeTargetMode === "all"
                                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                      : "text-slate-600 dark:text-slate-400"
                                  }`}
                                  onClick={() => setFreezeTargetMode("all")}
                                >
                                  Tous
                                </button>
                                <button
                                  type="button"
                                  className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                                    freezeTargetMode === "single"
                                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                      : "text-slate-600 dark:text-slate-400"
                                  }`}
                                  onClick={() => setFreezeTargetMode("single")}
                                >
                                  Choix
                                </button>
                              </div>
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
                                  color="indigo"
                                />
                              </div>
                            </div>
                            
                            <AnimatedPrice value={estimatedFreezeCost} />
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
                          details={<>
                            Rétrécit le cercle de brouillage des joueurs (zone floue autour d'eux). Si les joueurs l'ont agrandi, une première utilisation le ramène à la normale, puis le réduit encore.
                          </>}
                          onUse={() => {
                            if (jamIsMin) return;
                            socket?.emit("use_power", { kind: "zone_morph" }, (res) => {
                              if (res?.ok) {
                                addNotification("Zone modifiée", "success");
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
                            addNotification("Touchez la carte pour choisir l'emplacement du leurre.", "info", 6000);
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
                                    Prochaine balise dans {Math.max(0, Math.floor((gameState.nextBaliseAt - Date.now()) / 1000))}s.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </PowerCard>
                      </>
                    )}
                  </div>
                </div>
              )}

              {gameTab === "admin" && isHost && renderAdminPanel()}

              {gameTab === "map" && catLocked && isCat && (
                <CatMapLockOverlay mapUnlockAt={gameState.mapUnlockAt} socket={socket} />
              )}

              {gameTab === "map" && !(catLocked && isCat) && (
                <div className="relative h-full w-full">
                  <MapControls
                    basemapId={mapBasemap}
                    onBasemapChange={setMapBasemap}
                    onRecenter={() => setRecenterTick((n) => n + 1)}
                    onZoomIn={() => setZoomInTick((n) => n + 1)}
                    onZoomOut={() => setZoomOutTick((n) => n + 1)}
                  />
                  {baliseLureSelecting && role === "cat" && (
                    <div className="pointer-events-none absolute inset-x-0 top-14 z-[1200] flex justify-center px-4 md:top-3">
                      <div className="rounded-full bg-gradient-to-r from-[#A78BFA] to-[#EC4899] px-4 py-2 text-xs font-bold text-white shadow-lg">
                        Touchez la carte pour placer le leurre
                      </div>
                    </div>
                  )}
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
                          addNotification("Balise-leurre programmée", "success");
                        } else {
                          addNotification(res?.error || "Erreur", "error");
                        }
                      });
                    }}
                  />
                </div>
              )}

              {(gameTab === "map" || gameTab === "social") && (
                <>
                  {/* HUD mobile en haut */}
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-[800] md:hidden">
                    <MapHud
                      variant="mobile"
                      role={role}
                      isSpectator={me?.spectator}
                      jamLevel={jamLevel}
                      connected={connected}
                      shrinkZoneEnabled={gameState.settings?.shrinkZoneEnabled}
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
                      powerEffect={hudPowerEffect}
                      powerUiNow={hudPowerUiNow}
                      onGhostCancel={() => {
                        socket?.emit("use_power", { kind: "invisibility_cancel" }, (res) => {
                          if (!res?.ok && res?.error) addNotification(res.error, "error");
                        });
                      }}
                    />
                  </div>
                  {/* Pièces séparées en haut à droite (mobile) */}
                  <div className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[810] md:hidden">
                    <CoinsBadge coins={me?.coins} />
                  </div>
                  <div className="pointer-events-none absolute left-3 top-14 z-[800] hidden md:block">
                    <MapHud
                      variant="desktop"
                      role={role}
                      isSpectator={me?.spectator}
                      jamLevel={jamLevel}
                      connected={connected}
                      shrinkZoneEnabled={gameState.settings?.shrinkZoneEnabled}
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
                      powerEffect={hudPowerEffect}
                      powerUiNow={hudPowerUiNow}
                      onGhostCancel={() => {
                        socket?.emit("use_power", { kind: "invisibility_cancel" }, (res) => {
                          if (!res?.ok && res?.error) addNotification(res.error, "error");
                        });
                      }}
                    />
                  </div>
                  <div className="pointer-events-none absolute right-3 top-3 z-[810] hidden md:block">
                    <CoinsBadge coins={me?.coins} />
                  </div>
                </>
              )}

              <CoinFeed socket={socket} sessionId={sessionIdRef.current} />
              <div className="pointer-events-none absolute right-3 top-3 z-[800] hidden md:flex items-center gap-2">
                <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
              </div>
            </div>

            <BottomNav
              activeTab={gameTab}
              onTabChange={setGameTab}
              chatOpen={gameTab === "social"}
              onChatToggle={() => {}}
              canShowMap={showMapTab}
              showAdmin={isHost}
              centerAction={isCat && !catLocked ? "scan" : isPrey || capturedPrey ? "qr" : null}
              onCenterAction={() => {
                setErrorBanner(null);
                if (isCat && !catLocked) setShowScan(true);
                else if (isPrey || capturedPrey) setShowQr(true);
              }}
              onMore={() => {
                if (isHost) {
                  setGameTab("admin");
                } else {
                  setShowShareParty(true);
                }
              }}
              onQuit={!isHost ? leaveGame : undefined}
            />

            {/* Overlay d'immobilisation — fond léger, détail dans le HUD */}
            {me?.immobilizedUntil && me.immobilizedUntil > ghostUiNow && (
              <div className="pointer-events-auto fixed inset-0 z-[1900] bg-slate-950/50 backdrop-blur-[2px]" />
            )}

            {/* Desktop tabs (hidden on mobile since dock replaces them) */}
            <div className="hidden shrink-0 border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90 md:flex">
              {tabBtn("map", "Carte", !showMapTab)}
              {tabBtn("social", "Social")}
              {tabBtn("powers", "Super")}
              {isHost && tabBtn("admin", "Admin")}
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
                <button type="button" onClick={() => { setErrorBanner(null); setShowScan(true); }} className="flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#C45454] py-4 text-base font-semibold text-white transition-colors hover:bg-[#B04A4A]">
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
        {showScan && <ScannerModal onScan={onScanResult} onClose={() => setShowScan(false)} />}
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
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}
