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
import GameTimer from "./components/game/GameTimer.jsx";
import ZonePhaseIndicator from "./components/game/ZonePhaseIndicator.jsx";
import GameInfoPanel from "./components/game/GameInfoPanel.jsx";
import { NotificationContainer, useNotifications } from "./components/ui/NotificationSystem.jsx";
import ConfigHint from "./components/ui/ConfigHint.jsx";
import SliderWithParticles from "./components/ui/SliderWithParticles.jsx";
import PartyChatPanel from "./components/game/PartyChatPanel.jsx";
import PlayerSheet from "./components/game/PlayerSheet.jsx";
import ZoneShrinkAnimation from "./components/game/ZoneShrinkAnimation.jsx";
import BottomNav from "./components/ui/BottomNav.jsx";
import CircularLobby from "./components/CircularLobby.jsx";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// localStorage keys for session persistence
const LS_SESSION_KEY = "chase_gps_session";
const LS_ROOM_KEY = "chase_gps_room";
const LS_NICKNAME_KEY = "chase_gps_nickname";
const LS_LAST_NICKNAME_KEY = "chase_gps_last_nickname";
const LS_LAST_ROOM_KEY = "chase_gps_last_room";
function saveSession(sessionId, roomCode, nickname) {
  try {
    localStorage.setItem(LS_SESSION_KEY, sessionId);
    localStorage.setItem(LS_ROOM_KEY, roomCode);
    localStorage.setItem(LS_NICKNAME_KEY, nickname);
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
}

function loadSession() {
  try {
    const sessionId = localStorage.getItem(LS_SESSION_KEY);
    const roomCode = localStorage.getItem(LS_ROOM_KEY);
    const nickname = localStorage.getItem(LS_NICKNAME_KEY);
    if (sessionId && roomCode) {
      return { sessionId, roomCode, nickname: nickname || "Joueur" };
    }
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
  return null;
}

function clearSession() {
  try {
    localStorage.removeItem(LS_SESSION_KEY);
    localStorage.removeItem(LS_ROOM_KEY);
    localStorage.removeItem(LS_NICKNAME_KEY);
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
}

function saveLastNickname(nickname) {
  try {
    localStorage.setItem(LS_LAST_NICKNAME_KEY, nickname);
  } catch (e) {
    console.warn("localStorage non disponible:", e);
  }
}

function loadLastNickname() {
  try {
    return localStorage.getItem(LS_LAST_NICKNAME_KEY) || "";
  } catch (e) {
    console.warn("localStorage non disponible:", e);
    return "";
  }
}

function loadLastRoom() {
  try {
    return localStorage.getItem(LS_LAST_ROOM_KEY) || "";
  } catch (e) {
    console.warn("localStorage non disponible:", e);
    return "";
  }
}

function roleBadgeText(p) {
  if (p.spectator) return "Spectateur";
  if (p.role === "cat" && p.originalRole === "player") return "Chat (devenu chat)";
  if (p.role === "cat") return "Chat";
  if (p.role === "player" && p.originalRole === "cat") return "Joueur (ex-chat)";
  return "Joueur";
}

// Parse URL for room code
function getCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("code") || "";
  } catch {
    return "";
  }
}

function getRecapIdFromPath() {
  try {
    const m = window.location.pathname.match(/^\/recap\/([A-Za-z0-9]+)\/?$/);
    return m ? m[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

function ReconnectModal({ isReconnecting, reconnectAttempt, onCancel, lastError }) {
  if (!isReconnecting) return null;
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reconnexion en cours"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Reconnexion en cours...
        </h2>
        <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
          Tentative {reconnectAttempt}
        </p>
        {lastError && (
          <p className="mb-4 text-xs text-red-600 dark:text-red-400">{lastError}</p>
        )}
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-500">
          La connexion a ete perdue. Nous essayons de vous reconnecter automatiquement.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Annuler et quitter
          </button>
        )}
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
  const [recenterTick, setRecenterTick] = useState(0);
  const [zoomInTick, setZoomInTick] = useState(0);
  const [zoomOutTick, setZoomOutTick] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectError, setReconnectError] = useState(null);
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
  const [showZoneShrinkAnimation, setShowZoneShrinkAnimation] = useState(false);
  const [isOutOfBounds, setIsOutOfBounds] = useState(false);
  const outOfBoundsAudioRef = useRef(null);
  const lastNicknameRef = useRef("");
  const sessionIdRef = useRef(null);
  const isHostRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const entryReqRef = useRef(0);
  const onJoinRef = useRef(null);
  const [reconnectBlockAt, setReconnectBlockAt] = useState(0);
  const [reconnectUiNow, setReconnectUiNow] = useState(() => Date.now());
  const [focusCenter, setFocusCenter] = useState(null);
  const [focusTick, setFocusTick] = useState(0);
  const lastPingRef = useRef(Date.now());
  const socketRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  sessionIdRef.current = sessionId;
  isHostRef.current = isHost;

  useEffect(() => {
    setShowShareParty(false);
    setEntryBusyKind(null);
    // Check for rejoin candidate when entering entry screen
    if (stage === "entry") {
      const lastRoom = loadLastRoom();
      const lastNick = loadLastNickname();
      if (lastRoom && lastNick && !resumeCandidate) {
        setRejoinCandidate({ roomCode: lastRoom, nickname: lastNick });
      }
    } else {
      setRejoinCandidate(null);
    }
  }, [stage, resumeCandidate]);

  useEffect(() => {
    if (!isReconnecting) {
      setReconnectUiNow(Date.now());
      setReconnectBlockAt(0);
      return;
    }
    setReconnectBlockAt(Date.now() + 5000);
    const id = setInterval(() => setReconnectUiNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [isReconnecting]);

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
  }, []);

  // Reconnection with exponential backoff
  const attemptReconnect = useCallback((s, attempt = 1) => {
    const saved = loadSession();
    if (!saved) {
      setIsReconnecting(false);
      return;
    }

    setReconnectAttempt(attempt);
    
    s.emit("reconnect_session", { 
      sessionId: saved.sessionId, 
      roomCode: saved.roomCode 
    }, (res) => {
      if (res?.ok) {
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setReconnectError(null);
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
      } else {
        setReconnectError(res?.error || "Echec de reconnexion");
        
        if (
          res?.error?.includes("expir") ||
          res?.error?.includes("n'existe plus") ||
          res?.error?.includes("n'existe") ||
          res?.error?.includes("termin")
        ) {
          clearSession();
          setIsReconnecting(false);
          resetToEntry(false);
          return;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (s.connected) {
            attemptReconnect(s, attempt + 1);
          }
        }, delay);
      }
    });
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
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
    });
    setSocket(s);
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      lastPingRef.current = Date.now();
      
      const saved = loadSession();
      if (!saved || stageRef.current === "summary") return;
      if (stageRef.current === "entry") {
        setResumeCandidate(saved);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setReconnectError(null);
        return;
      }
      setIsReconnecting(true);
      attemptReconnect(s);
    });

    s.on("disconnect", () => {
      setConnected(false);
      
      if (stageRef.current === "lobby" || stageRef.current === "role_reveal" || stageRef.current === "game") {
        setIsReconnecting(true);
        setReconnectError(null);
      }
    });

    s.on("server_ping", ({ t }) => {
      lastPingRef.current = Date.now();
      s.emit("client_pong", { t });
    });

    s.on("lobby_update", (payload) => {
      setIsReconnecting(false);
      setLobby(payload);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
      if (payload.phase === "lobby") setStage("lobby");
    });

    s.on("roles_reveal", (payload) => {
      setIsReconnecting(false);
      setRolesReveal(payload);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
      setStage("role_reveal");
    });

    s.on("game_state", (payload) => {
      setIsReconnecting(false);
      setGameState(payload);
      setRole(payload.me?.role ?? null);
      if (payload.partyChat) setPartyChatMessages(payload.partyChat);
      if (payload.phase === "playing") setStage("game");
      
      // Trigger zone shrink animation when radius changes
      if (payload.settings?.shrinkZoneEnabled && payload.effectiveGlobalRadiusM) {
        setShowZoneShrinkAnimation(true);
        setTimeout(() => setShowZoneShrinkAnimation(false), 2000);
      }
    });

    s.on("game_finished", (data) => {
      clearSession();
      setSummary(data);
      setStage("summary");
      setGameState(null);
    });

    s.on("capture_ok", (data) => {
      addNotification(`${data.preyNickname} a été attrapé !`, "success");
    });

    s.on("player_out_of_bounds", (data) => {
      if (data.sessionId === sessionIdRef.current) {
        setIsOutOfBounds(true);
        addNotification(`Vous êtes sorti de la zone de jeu!`, "error", 5000);
        if (navigator.vibrate) {
          navigator.vibrate([300, 150, 300]);
        }
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "square";
          osc.frequency.value = 300;
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          osc.start();
          outOfBoundsAudioRef.current = { audioCtx, osc, gain };
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
      addNotification("Vous avez ete expulse de la partie.", "error");
      resetToEntry();
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!s.connected) {
          s.connect();
        } else {
          s.emit("refresh_state");
        }
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
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
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.value = 0; // silent
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
    if (navigator.vibrate) {
      try { navigator.vibrate(1); } catch(e) {}
    }
  }, []);

  const onCreate = useCallback(() => {
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
    socket.emit("create_room", { nickname: trimmedNickname }, (res) => {
      if (reqId !== entryReqRef.current) return;
      setEntryBusyKind(null);
      if (!res?.ok) {
        setErrorBanner(res?.error || "Impossible de creer la salle.");
        return;
      }
      // Clear code from URL on successful create
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
      if (!socket) return;
      socket.emit("respond_join_request", { requestId, accept }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Action impossible.");
        setJoinRequestQueue((q) => q.filter((x) => x.requestId !== requestId));
      });
    },
    [socket]
  );

  const onJoin = useCallback(() => {
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
    socket.emit(
      "join_room",
      { code: roomCodeInput.trim(), nickname: trimmedNickname },
      (res) => {
        if (reqId !== entryReqRef.current) return;
        setEntryBusyKind(null);
        if (res?.ok) {
          // Clear code from URL on successful join
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
        // Check if error is about duplicate nickname
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
      if (!socket) return;
      socket.emit("update_settings", partial, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Mise a jour refusee.");
        else if (res.lobby) setLobby(res.lobby);
      });
    },
    [socket]
  );

  const onRevealRoles = useCallback(() => {
    if (!socket) return;
    socket.emit("start_roles", {}, (res) => {
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de reveler les roles.");
    });
  }, [socket]);

  const onBeginHunt = useCallback(() => {
    if (!socket) return;
    socket.emit("begin_hunt", {}, (res) => {
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de demarrer la chasse.");
    });
  }, [socket]);

  const onScanResult = useCallback(
    (text) => {
      if (!socket || !text) return;
      const id = String(text).trim();
      socket.emit("capture_scan", { targetSessionId: id }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Capture refusee.");
        else setShowScan(false);
      });
    },
    [socket]
  );

  const adminKick = useCallback(
    (targetSessionId) => {
      if (!socket) return;
      socket.emit("admin_kick", { targetSessionId }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Expulsion refusee.");
      });
    },
    [socket]
  );

  const adminSetRole = useCallback(
    (targetSessionId, r) => {
      if (!socket) return;
      socket.emit("admin_set_role", { targetSessionId, role: r }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Changement refuse.");
      });
    },
    [socket]
  );

  const adminEndGame = useCallback(() => {
    if (!socket) return;
    socket.emit("admin_end_game", {}, (res) => {
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
      } catch (e) {
        console.warn("localStorage non disponible:", e);
      }
    }

    // Clear session and reset UI immediately to prevent any auto-reconnect logic
    clearSession();
    resetToEntry(false);

    if (socket && connected) {
      socket.emit("leave_room", {}, (res) => {
        // Already reset UI, just a confirmation
      });
    }
  }, [socket, connected, resetToEntry]);

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
        }
      }
    }
    
    // Add admin prey preview location data (if host with preview enabled)
    if (isHost) {
      for (const p of gameState?.adminPreyPreview || []) {
        if (p.sessionId && p.kind === "exact" && p.lat != null && p.lng != null) {
          locationMap.set(p.sessionId, { lat: p.lat, lng: p.lng });
        }
      }
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
  }, [gameState?.roster, gameState?.allies, gameState?.catsExact, gameState?.preyForCat, gameState?.adminPreyPreview, rolesReveal?.players, role, isHost]);

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
    setFocusTick((n) => n + 1);
  }, []);

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

  const showReconnectModal =
    isReconnecting && (stage === "game" ? reconnectUiNow >= reconnectBlockAt : true);

  const reconnectModal = (
    <ReconnectModal
      isReconnecting={showReconnectModal}
      reconnectAttempt={reconnectAttempt}
      lastError={reconnectError}
      onCancel={isHost ? null : leaveGame}
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

        {resumeCandidate && connected && (
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Partie en cours détectée
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Salle <span className="font-mono font-bold">{resumeCandidate.roomCode}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = socketRef.current;
                  if (!s) return;
                  setIsReconnecting(true);
                  setResumeCandidate(null);
                  attemptReconnect(s);
                }}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
              >
                Reprendre
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setResumeCandidate(null);
                }}
                className="flex-1 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                Oublier
              </button>
            </div>
          </div>
        )}

        {rejoinCandidate && connected && !resumeCandidate && (
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
                    setNickname(rejoinCandidate.nickname);
                    setRoomCodeInput(rejoinCandidate.roomCode);
                    setEntryMode("join");
                    setRejoinCandidate(null);
                    // Short delay to ensure state updates before joining
                    setTimeout(() => onJoin(), 100);
                  }}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  Rejoindre maintenant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(LS_LAST_ROOM_KEY);
                    } catch (e) {
                      console.warn("localStorage non disponible:", e);
                    }
                    setRejoinCandidate(null);
                  }}
                  className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setEntryMode("create");
              setErrorBanner(null);
              setNicknameError(null);
            }}
            disabled={Boolean(entryBusyKind)}
            className={`flex-1 rounded-lg py-3 text-sm font-bold transition-colors ${
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
            className={`flex-1 rounded-lg py-3 text-sm font-bold transition-colors ${
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
            className="w-full rounded-[8px] bg-[#5B7FA5] py-4 text-base font-semibold text-white transition-colors hover:bg-[#4A6A8A]"
          >
            {entryBusyKind === "create" ? "Création…" : "Creer ma partie"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={Boolean(entryBusyKind)}
            className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            {entryBusyKind === "join" ? "Connexion…" : "Rejoindre la partie"}
          </button>
        )}

        {entryBusyKind && (
          <button
            type="button"
            onClick={() => {
              entryReqRef.current += 1;
              setEntryBusyKind(null);
            }}
            className="mt-3 w-full rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            Annuler
          </button>
        )}

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
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/80">
                  <span className="text-sm text-slate-800 dark:text-slate-100">
                    Zone globale qui rétrécit
                  </span>
                  <input
                    type="checkbox"
                    checked={!!settings.shrinkZoneEnabled}
                    onChange={(e) =>
                      pushSettings({ shrinkZoneEnabled: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 dark:border-slate-500"
                  />
                </label>
                <ConfigHint>
                  Le cercle autorisé se resserre par paliers jusqu’au rayon minimum, pour resserrer la partie sur la fin.
                </ConfigHint>
                {settings.shrinkZoneEnabled && (
                  <div className="mt-2 space-y-2 pl-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Durée jusqu&apos;au rayon min (min) :{" "}
                      {settings.shrinkDurationMinutes ?? 15}
                    </label>
                    <SliderWithParticles
                      type="range"
                      min={3}
                      max={60}
                      step={1}
                      value={settings.shrinkDurationMinutes ?? 15}
                      onChange={(e) =>
                        pushSettings({
                          shrinkDurationMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full accent-matte-blue"
                    />
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Rayon minimum (m) : {settings.shrinkMinRadiusM ?? 100}
                    </label>
                    <SliderWithParticles
                      type="range"
                      min={30}
                      max={800}
                      step={10}
                      value={settings.shrinkMinRadiusM ?? 100}
                      onChange={(e) =>
                        pushSettings({
                          shrinkMinRadiusM: Number(e.target.value),
                        })
                      }
                      className="w-full accent-matte-blue"
                    />
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Paliers : {settings.shrinkPhases ?? 5}
                    </label>
                    <SliderWithParticles
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={settings.shrinkPhases ?? 5}
                      onChange={(e) =>
                        pushSettings({ shrinkPhases: Number(e.target.value) })
                      }
                      className="w-full accent-matte-blue"
                    />
                  </div>
                )}

                <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/80">
                  <span className="text-sm text-slate-800 dark:text-slate-100">
                    Limite de durée
                  </span>
                  <input
                    type="checkbox"
                    checked={!!settings.timeLimitEnabled}
                    onChange={(e) =>
                      pushSettings({ timeLimitEnabled: e.target.checked })
                    }
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

    const renderAdminPanel = () => (
      <div className="h-full overflow-auto p-4">
        <div className="mb-4 rounded-[8px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Code de la partie</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-[#5B7FA5]">{currentRoomCode}</p>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
          Contrôle hôte
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Actions visibles par tous : expliquez-les si besoin pour éviter les surprises.
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Terminer la partie pour tout le monde et afficher le récapitulatif ?"
              )
            ) {
              adminEndGame();
            }
          }}
          className="mb-2 w-full rounded-xl border border-red-300 bg-red-50 py-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100"
        >
          Fermer la partie (récap pour tous)
        </button>
        <ConfigHint>
          Arrête la chasse immédiatement et affiche le résumé pour chaque participant connecté.
        </ConfigHint>
        <ul className="mt-6 space-y-4">
          {rosterList.map((p) => (
            <li
              key={p.sessionId}
              className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
            >
              <div className="font-medium text-slate-900 dark:text-white">
                {p.nickname}
                {p.sessionId === sessionId ? " (vous)" : ""}
              </div>
              <p className="text-xs text-slate-500">{roleBadgeText(p)}</p>
              {p.sessionId !== sessionId && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white dark:bg-orange-600"
                      onClick={() => adminSetRole(p.sessionId, "cat")}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white dark:bg-sky-600"
                      onClick={() => adminSetRole(p.sessionId, "player")}
                    >
                      Joueur
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
                      onClick={() => adminKick(p.sessionId)}
                    >
                      Expulser
                    </button>
                  </div>
                  <ConfigHint>
                    Chat / Joueur : corrige le camp en cours de partie. Expulser : retire la personne sans attendre la fin.
                  </ConfigHint>
                </div>
              )}
            </li>
          ))}
        </ul>
        {!isHost && (
          <button
            type="button"
            onClick={leaveGame}
            className="mt-6 w-full rounded-[8px] border border-slate-300 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Quitter la partie
          </button>
        )}
      </div>
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
              {gameTab === "players" && (
                <div className="h-full overflow-auto p-4 pb-24">
                  <div className="mb-4 rounded-[8px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Code de la partie</p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-[#5B7FA5]">{currentRoomCode}</p>
                  </div>
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowShareParty(true)}
                      className="w-full rounded-[8px] bg-[#5B7FA5] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4A6A8A]"
                    >
                      Partager
                    </button>
                  </div>
                  <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Participants</h2>
                  <ul className="space-y-3">
                    {rosterList.map((p) => (
                      <li key={p.sessionId} onClick={() => setSelectedPlayer(p)} className="cursor-pointer rounded-[8px] bg-white p-4 ring-1 ring-slate-200 active:scale-[0.98] dark:bg-slate-800 dark:ring-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {p.nickname}
                            {p.sessionId === sessionId && <span className="ml-1 text-xs text-[#5B7FA5]">(vous)</span>}
                          </span>
                          {p.coins !== undefined && p.coins > 0 && (
                            <div className="flex items-center gap-1">
                              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                              </svg>
                              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{p.coins}</span>
                            </div>
                          )}
                        </div>
                        {p.disconnected && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Déconnecté</span>}
                        <p className={`mt-1 text-sm ${p.role === "cat" ? "text-[#C45454]" : "text-[#5B7FA5]"}`}>{roleBadgeText(p)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {gameTab === "chat" && (
                <div className="h-full p-4 pb-24">
                  <PartyChatPanel
                    fillHeight
                    variant="discussion"
                    messages={partyChatMessages}
                    sessionId={sessionId}
                    onSend={sendPartyChat}
                    position={position}
                    disabled={!socket}
                    onFocusLocation={onFocusChatLocation}
                  />
                </div>
              )}

              {gameTab === "admin" && isHost && renderAdminPanel()}

              {gameTab === "map" && catLocked && isCat && (
                <CatMapLockOverlay mapUnlockAt={gameState.mapUnlockAt} socket={socket} />
              )}

              {gameTab === "map" && !(catLocked && isCat) && (
                <div className="relative h-full w-full">
                  {gameState.settings?.shrinkZoneEnabled && (
                    <div className="pointer-events-none absolute left-3 top-3 z-[1000]">
                      <ZonePhaseIndicator
                        currentRadius={gameState.effectiveGlobalRadiusM}
                        nextRadius={gameState.nextPhaseRadiusM}
                        phaseEndsAt={gameState.phaseEndsAt}
                        totalPhases={gameState.totalPhases || 5}
                        currentPhase={gameState.currentPhase || 1}
                      />
                    </div>
                  )}
                  <MapControls
                    basemapId={mapBasemap}
                    onBasemapChange={setMapBasemap}
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
                    onPlayerClick={setSelectedPlayer}
                  />
                </div>
              )}

              {/* Floating info bar above dock */}
              <div className="pointer-events-none absolute bottom-20 left-0 right-0 z-[800] flex flex-col items-center gap-2 px-4 md:hidden">
                <GameInfoPanel
                  role={role}
                  isSpectator={me?.spectator}
                  phaseEndsAt={gameState.phaseEndsAt}
                  nextBaliseAt={gameState.nextBaliseAt}
                  currentRadius={gameState.effectiveGlobalRadiusM}
                  nextRadius={gameState.nextPhaseRadiusM}
                  totalPhases={gameState.totalPhases}
                  currentPhase={gameState.currentPhase}
                  shrinkZoneEnabled={gameState.settings?.shrinkZoneEnabled}
                  coins={me?.coins}
                />
                <div className="pointer-events-auto flex items-center gap-2 rounded-[8px] bg-white/90 px-3 py-1.5 shadow backdrop-blur dark:bg-slate-900/90">
                  {catLocked && isCat && gameState.mapUnlockAt && (
                    <CatLockCountdownHeader mapUnlockAt={gameState.mapUnlockAt} socket={socket} />
                  )}
                  {gameState.timeLimitEndsAt && <GameTimer endsAt={gameState.timeLimitEndsAt} />}
                  {!connected && <span className="animate-pulse text-xs text-[#C45454]">Déconnecté</span>}
                </div>
              </div>

              {/* Desktop info bar (top) */}
              <div className="pointer-events-none absolute left-3 top-3 z-[800] hidden md:block">
                <GameInfoPanel
                  role={role}
                  isSpectator={me?.spectator}
                  phaseEndsAt={gameState.phaseEndsAt}
                  nextBaliseAt={gameState.nextBaliseAt}
                  currentRadius={gameState.effectiveGlobalRadiusM}
                  nextRadius={gameState.nextPhaseRadiusM}
                  totalPhases={gameState.totalPhases}
                  currentPhase={gameState.currentPhase}
                  shrinkZoneEnabled={gameState.settings?.shrinkZoneEnabled}
                  coins={me?.coins}
                />
              </div>
              <div className="pointer-events-none absolute right-3 top-3 z-[800] hidden md:flex items-center gap-2">
                {catLocked && isCat && gameState.mapUnlockAt && (
                  <CatLockCountdownHeader mapUnlockAt={gameState.mapUnlockAt} socket={socket} />
                )}
                {gameState.timeLimitEndsAt && <GameTimer endsAt={gameState.timeLimitEndsAt} />}
                {gameState.settings?.shrinkZoneEnabled && (
                  <span className="text-xs text-violet-600 dark:text-violet-400">Zone rétrécit</span>
                )}
                <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
                {!connected && <span className="animate-pulse text-xs text-[#C45454]">Déconnecté</span>}
              </div>
            </div>

            <BottomNav
              activeTab={gameTab}
              onTabChange={setGameTab}
              chatOpen={gameTab === "chat"}
              onChatToggle={(open) => {
                if (open) {
                  setGameTab("chat");
                } else {
                  setGameTab("map");
                }
              }}
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
              onQuit={isHost ? null : leaveGame}
            />

            {/* Desktop tabs (hidden on mobile since dock replaces them) */}
            <div className="hidden shrink-0 border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90 md:flex">
              {tabBtn("map", "Carte", !showMapTab)}
              {tabBtn("chat", "Chat")}
              {tabBtn("players", "Joueurs")}
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
        {selectedPlayer && (
          <PlayerSheet
            player={selectedPlayer}
            roomCode={currentRoomCode}
            onClose={() => setSelectedPlayer(null)}
            onShowLocation={(lat, lng) => {
              setGameTab("map");
              setFocusCenter([lat, lng]);
              setFocusTick((n) => n + 1);
            }}
          />
        )}
        <ZoneShrinkAnimation isActive={showZoneShrinkAnimation} />
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}
