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
import { NotificationContainer, useNotifications } from "./components/ui/NotificationSystem.jsx";
import ConfigHint from "./components/ui/ConfigHint.jsx";
import PartyDiscussionChrome from "./components/game/PartyDiscussionChrome.jsx";
import { BASEMAPS } from "./lib/map/basemaps.js";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// localStorage keys for session persistence
const LS_SESSION_KEY = "chase_gps_session";
const LS_ROOM_KEY = "chase_gps_room";
const LS_NICKNAME_KEY = "chase_gps_nickname";
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
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Reconnexion en cours"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-card-lg dark:bg-navy-800">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-blue/20 border-t-brand-blue" />
        <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
          Reconnexion en cours...
        </h2>
        <p className="mb-1 text-sm text-navy-500 dark:text-navy-400">
          Tentative {reconnectAttempt}
        </p>
        {lastError && (
          <p className="mb-4 text-xs text-brand-red dark:text-brand-red">{lastError}</p>
        )}
        <p className="mb-5 text-xs text-navy-400 dark:text-navy-500">
          La connexion a ete perdue. Nous essayons de vous reconnecter automatiquement.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-overlay)] py-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]"
        >
          Annuler et quitter
        </button>
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
    <div className="flex h-full flex-col justify-center bg-[var(--color-bg-raised)] p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-[var(--color-bg)] p-6 shadow-card-lg ring-1 ring-[var(--color-border)]">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-brand-red">
          Chat · carte verrouillée
        </p>
        <p className="mt-3 text-center text-5xl font-black tabular-nums text-[var(--color-text)]">
          {mm}:{String(ss).padStart(2, "0")}
        </p>
        <p className="mt-3 text-center text-sm text-[var(--color-text-muted)]">
          La carte s'ouvre automatiquement à la fin du délai. Vous pouvez consulter
          l'onglet Joueurs : le compte à rebours reste visible en haut de l'écran.
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
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red-light px-2.5 py-1 text-xs font-bold tabular-nums text-brand-red ring-1 ring-brand-red/20 dark:bg-brand-red/15 dark:text-brand-red dark:ring-brand-red/30">
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Carte · {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}

// Theme toggle button component
function ThemeToggle({ theme, onToggle, size = "md" }) {
  const sizeClasses = size === "sm" 
    ? "h-9 w-9 text-sm" 
    : "px-3.5 py-2.5 text-xs";
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-overlay)] active:bg-[var(--color-border)] ${sizeClasses}`}
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
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState("entry");
  const [nickname, setNickname] = useState(() => {
    const saved = loadSession();
    return saved?.nickname || "";
  });
  const [roomCodeInput, setRoomCodeInput] = useState(() => getCodeFromUrl());
  const [sessionId, setSessionId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [lobby, setLobby] = useState(null);
  const [rolesReveal, setRolesReveal] = useState(null);
  const [role, setRole] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);
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
  const [discussionMobileOpen, setDiscussionMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false
  );
  const [showShareParty, setShowShareParty] = useState(false);
  const [recapSlug, setRecapSlug] = useState(() => getRecapIdFromPath());
  const [recapData, setRecapData] = useState(null);
  const [recapErr, setRecapErr] = useState(false);
  const [recapLoading, setRecapLoading] = useState(() => Boolean(getRecapIdFromPath()));
  const lastNicknameRef = useRef("");
  const sessionIdRef = useRef(null);
  const isHostRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const lastPingRef = useRef(Date.now());
  const socketRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  sessionIdRef.current = sessionId;
  isHostRef.current = isHost;

  useEffect(() => {
    setShowShareParty(false);
    setDiscussionMobileOpen(false);
  }, [stage]);

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

  // Auto-switch to join mode if URL has code
  useEffect(() => {
    const urlCode = getCodeFromUrl();
    if (urlCode) {
      setEntryMode("join");
      setRoomCodeInput(urlCode);
    }
  }, []);

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
        setIsReconnecting(true);
      }
      attemptReconnect(s);
    });

    s.on("disconnect", () => {
      setConnected(false);
      
      if (stageRef.current === "game") {
        setIsReconnecting(true);
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
    });

    s.on("game_finished", (data) => {
      clearSession();
      setSummary(data);
      setStage("summary");
      setGameState(null);
    });

    s.on("capture_ok", (data) => {
      addNotification(`${data.preyNickname} a ete capture!`, "success");
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
      if (data?.hostSessionId) {
        if (data.hostSessionId !== sessionIdRef.current) return;
      } else if (!isHostRef.current) {
        return;
      }
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
      zoneMode: "circle",
      cityPolygons: [],
      cityDifficulty: "medium",
      timeLimitEnabled: false,
      timeLimitMinutes: 30,
      catAssignmentMode: "random",
      hostCatMapPreview: false,
    };

  const onCreate = useCallback(() => {
    if (!socket || !nickname.trim()) {
      setErrorBanner("Choisissez un pseudo.");
      return;
    }
    setErrorBanner(null);
    socket.emit("create_room", { nickname: nickname.trim() }, (res) => {
      if (!res?.ok) {
        setErrorBanner(res?.error || "Impossible de creer la salle.");
        return;
      }
      saveSession(res.sessionId, res.code, nickname.trim());
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
    setErrorBanner(null);
    lastNicknameRef.current = nickname.trim();
    socket.emit(
      "join_room",
      { code: roomCodeInput.trim(), nickname: nickname.trim() },
      (res) => {
        if (res?.ok) {
          saveSession(res.sessionId, res.code, nickname.trim());
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
              nickname: nickname.trim(),
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
        setErrorBanner(res?.error || "Impossible de rejoindre.");
      }
    );
  }, [socket, nickname, roomCodeInput, addNotification]);

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
    if (gameState?.roster?.length) return gameState.roster;
    if (rolesReveal?.players?.length) {
      return rolesReveal.players.map((p) => ({
        sessionId: p.sessionId,
        nickname: p.nickname,
        role: p.role,
        originalRole: p.originalRole,
        captured: false,
        spectator: false,
      }));
    }
    return [];
  }, [gameState?.roster, rolesReveal?.players]);

  const geoChatImages = useMemo(
    () =>
      (partyChatMessages || [])
        .filter(
          (m) =>
            m.type === "image" &&
            m.image &&
            m.lat != null &&
            m.lng != null
        )
        .map((m) => ({
          id: m.id,
          lat: m.lat,
          lng: m.lng,
          image: m.image,
          nickname: m.nickname,
        })),
    [partyChatMessages]
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

  const reconnectModal = (
    <ReconnectModal
      isReconnecting={isReconnecting}
      reconnectAttempt={reconnectAttempt}
      lastError={reconnectError}
      onCancel={() => resetToEntry()}
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
      <div className="flex min-h-full flex-col bg-[var(--color-bg)] p-4 pb-8">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        
        <header className="mb-6 flex items-start justify-between gap-3 pt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Chase GPS
            </h1>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
              Les <strong className="font-semibold text-brand-red">chats</strong> traquent les{" "}
              <strong className="font-semibold text-brand-blue">joueurs</strong> sur une carte.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-faint)]">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-brand-yellow animate-pulse"}`} />
              {connected ? "Connecte" : "Connexion..."}
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        {errorBanner && (
          <div className="mb-4 rounded-xl bg-brand-red-light p-3.5 text-sm text-brand-red ring-1 ring-brand-red/20 dark:bg-brand-red/15 dark:ring-brand-red/30">
            {errorBanner}
          </div>
        )}

        <div className="mb-4 flex rounded-xl bg-[var(--color-bg-overlay)] p-1">
          <button
            type="button"
            onClick={() => {
              setEntryMode("create");
              setErrorBanner(null);
            }}
            className={`flex-1 rounded-lg py-3 text-sm font-bold transition-colors ${
              entryMode === "create"
                ? "seg-active"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            Creer une partie
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode("join");
              setErrorBanner(null);
            }}
            className={`flex-1 rounded-lg py-3 text-sm font-bold transition-colors ${
              entryMode === "join"
                ? "seg-active"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            Rejoindre
          </button>
        </div>

        <label className="mb-1.5 text-sm font-semibold text-[var(--color-text)]">
          Pseudo
        </label>
        <input
          className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3.5 text-base text-[var(--color-text)] outline-none ring-brand-blue focus:ring-2"
          placeholder="Votre nom"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          autoComplete="nickname"
        />

        {entryMode === "join" && (
          <>
            <label className="mb-1.5 text-sm font-semibold text-[var(--color-text)]">
              Code de la salle
            </label>
            <input
              className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3.5 text-base uppercase tracking-widest text-[var(--color-text)] outline-none ring-brand-blue focus:ring-2"
              placeholder="ex: AZERT"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
            />
          </>
        )}

        {entryMode === "create" ? (
          <button
            type="button"
            onClick={onCreate}
            className="w-full rounded-lg bg-brand-yellow py-4 text-base font-bold text-white transition-all active:opacity-90"
          >
            Creer ma partie
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="w-full rounded-lg bg-brand-yellow py-4 text-base font-bold text-white transition-all active:opacity-90"
          >
            Rejoindre la partie
          </button>
        )}

        {/* Game history section */}
        {midJoinWait && (
          <div className="mt-6 rounded-2xl bg-[var(--color-bg-raised)] p-5 shadow-card ring-1 ring-[var(--color-border)]">
            <p className="text-center text-sm font-semibold text-[var(--color-text)]">
              En attente · salle{" "}
              <span className="font-mono text-brand-blue">
                {midJoinWait.code}
              </span>
            </p>
            <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
              L'hôte doit accepter votre demande.
            </p>
            <button
              type="button"
              onClick={() => setMidJoinWait(null)}
              className="mt-4 w-full rounded-lg border border-[var(--color-border)] py-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-overlay)]"
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
      <div className="flex min-h-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:max-w-none">
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-faint)]">Salle</p>
            <p className="font-mono text-3xl font-bold tracking-widest text-brand-blue">
              {lobby.code}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {isHost ? "Vous etes l'hote" : "En attente de l'hote"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowShareParty(true)}
              className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white shadow-card-md transition-all active:opacity-90"
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
          <div className="mb-3 rounded-xl bg-brand-red-light p-3.5 text-sm text-brand-red ring-1 ring-brand-red/20 dark:bg-brand-red/15 dark:ring-brand-red/30">
            {errorBanner}
          </div>
        )}

        {isHost && joinRequestQueue.length > 0 && (
          <div className="mb-3 space-y-2">
            {joinRequestQueue.map((j) => (
              <div
                key={j.requestId}
                className="flex flex-col gap-2 rounded-xl border border-brand-yellow/40 bg-brand-yellow-light p-3 dark:border-brand-yellow/30 dark:bg-brand-yellow/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  <span className="font-bold">{j.nickname}</span> souhaite rejoindre
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all active:opacity-90"
                    onClick={() => respondJoinRequest(j.requestId, true)}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-overlay)] px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]"
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
          <div className="mb-3 rounded-xl bg-brand-yellow-light p-3.5 text-sm text-brand-yellow-dark ring-1 ring-brand-yellow/20 dark:bg-brand-yellow/10 dark:ring-brand-yellow/25">
            {geoError.message}
          </div>
        )}

        {!geoError && !position && (
          <div className="mb-3 rounded-xl bg-[var(--color-bg-overlay)] p-3.5 text-sm text-[var(--color-text-muted)]">
            Recherche du signal GPS... Autorisez la position.
          </div>
        )}

        <div className="rounded-2xl bg-[var(--color-bg-raised)] p-4 shadow-card ring-1 ring-[var(--color-border)]">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Joueurs ({lobby.players?.length ?? 0})
          </h2>
          <ul className="space-y-2">
            {(lobby.players || []).map((p) => (
              <li
                key={p.sessionId}
                className="flex items-center justify-between text-[var(--color-text)]"
              >
                <span>
                  {p.nickname}
                  {p.disconnected ? (
                    <span className="ml-2 text-xs font-medium text-brand-yellow-dark">
                      (deconnecte)
                    </span>
                  ) : null}
                </span>
                {p.sessionId === sessionId && (
                  <span className="text-xs text-brand-blue">vous</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="space-y-5 rounded-2xl bg-[var(--color-bg-raised)] p-4 shadow-card ring-1 ring-[var(--color-border)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Configuration de la partie
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Règles visibles par tous une fois la chasse lancée. La discussion reste à droite (ordinateur) ou derrière le bouton bulle (téléphone).
              </p>
            </div>
            <CityZonePicker
              position={position}
              zoneMode={settings.zoneMode || "circle"}
              onZoneModeChange={(m) => pushSettings({ zoneMode: m })}
              selectedRings={settings.cityPolygons || []}
              onChangeRings={(rings) => pushSettings({ cityPolygons: rings })}
            />

            {settings.zoneMode === "city" && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Difficulté (zone ville)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easy", label: "Simple" },
                    { id: "medium", label: "Moyen" },
                    { id: "hard", label: "Hard" },
                  ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pushSettings({ cityDifficulty: id })}
                    className={`rounded-lg py-3 text-xs font-bold ${
                      (settings.cityDifficulty || "medium") === id
                        ? "bg-brand-blue text-white shadow-card"
                        : "bg-[var(--color-bg-overlay)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                    }`}
                  >
                    {label}
                  </button>
                  ))}
                </div>
                <ConfigHint>
                  Ajuste la règle de brouillage et le rythme du jeu en mode contours de ville (pas de grand cercle unique).
                </ConfigHint>
              </div>
            )}

            {settings.zoneMode === "circle" && (
              <>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">
                    Rayon zone (m) : {settings.globalRadiusM}
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={2000}
                    step={50}
                    value={settings.globalRadiusM}
                    onChange={(e) =>
                      pushSettings({ globalRadiusM: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-indigo-600"
                  />
                  <ConfigHint>
                    Taille du terrain autorisé autour du centre de partie. Hors de ce cercle, le jeu peut pénaliser ou masquer les positions.
                  </ConfigHint>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">
                    Rayon brouillage (m) : {settings.jamRadiusM}
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    step={5}
                    value={settings.jamRadiusM}
                    onChange={(e) =>
                      pushSettings({ jamRadiusM: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-indigo-600"
                  />
                  <ConfigHint>
                    Autour de chaque joueur, une zone où la position des autres est volontairement imprécise pour les chats.
                  </ConfigHint>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">
                    Délai carte chats (min) : {settings.catDelayMinutes ?? 5}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={settings.catDelayMinutes ?? 5}
                    onChange={(e) =>
                      pushSettings({ catDelayMinutes: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-indigo-600"
                  />
                  <ConfigHint>
                    Au début de la chasse, les chats ne voient pas tout de suite la carte complète : ce délai laisse aux joueurs le temps de s’éloigner.
                  </ConfigHint>
                </div>
              </>
            )}

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
                className="mt-1 w-full accent-indigo-600"
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

            {settings.zoneMode === "circle" && (
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
                    <input
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
                      className="w-full accent-indigo-600"
                    />
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Rayon minimum (m) : {settings.shrinkMinRadiusM ?? 100}
                    </label>
                    <input
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
                      className="w-full accent-indigo-600"
                    />
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Paliers : {settings.shrinkPhases ?? 5}
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={settings.shrinkPhases ?? 5}
                      onChange={(e) =>
                        pushSettings({ shrinkPhases: Number(e.target.value) })
                      }
                      className="w-full accent-indigo-600"
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
                    <input
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
                      className="w-full accent-indigo-600"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isHost && (
          <button
            type="button"
            onClick={onRevealRoles}
            disabled={!lobby.canStartGps || !lobby.canRevealRoles}
            className="mt-auto w-full rounded-lg bg-emerald-600 py-4 text-base font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 active:opacity-90"
          >
            Reveler les roles
          </button>
        )}
        {isHost && !lobby.canRevealRoles && (
          <p className="mt-2 text-center text-xs text-brand-yellow-dark dark:text-brand-yellow">
            Il faut au moins 2 joueurs dans la salle pour lancer la partie.
          </p>
        )}
        {isHost && lobby.canRevealRoles && !lobby.canStartGps && (
          <p className="mt-2 text-center text-xs text-brand-yellow-dark dark:text-brand-yellow">
            Au moins une position GPS est necessaire pour le centre de la zone.
          </p>
        )}
          </main>
          <PartyDiscussionChrome
            desktop={isDesktop}
            open={discussionMobileOpen}
            onToggle={setDiscussionMobileOpen}
            fabBottomClass="bottom-6"
            messages={partyChatMessages}
            sessionId={sessionId}
            onSend={sendPartyChat}
            position={position}
            disabled={!socket}
          />
        </div>
      </div>
    );
  }

  // Role reveal screen
  if (stage === "role_reveal" && rolesReveal) {
    return (
      <div className="flex min-h-full flex-col bg-[var(--color-bg)]">
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
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-faint)]">Avant la chasse</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-brand-blue">
              {rolesReveal.code}
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">
              Attribution des rôles
            </h1>
            <p className="mt-1 max-w-md text-sm text-[var(--color-text-muted)]">
              Chaque participant voit son camp. En mode manuel, l&apos;hôte règle les autres joueurs uniquement — pas sa propre ligne.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowShareParty(true)}
              className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all active:opacity-90"
            >
              Partager
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {errorBanner && (
          <div className="rounded-xl bg-brand-red-light p-3.5 text-sm text-brand-red ring-1 ring-brand-red/20 dark:bg-brand-red/15 dark:ring-brand-red/30">
            {errorBanner}
          </div>
        )}

        {isHost && joinRequestQueue.length > 0 && (
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
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    p.role === "cat"
                      ? "badge-cat"
                      : "badge-player"
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
              {isHost && p.sessionId !== sessionId && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-brand-red px-3.5 py-3 text-sm font-bold text-white shadow-card transition-all active:scale-[0.98]"
                      onClick={() => adminSetRole(p.sessionId, "cat")}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-brand-blue px-3.5 py-3 text-sm font-bold text-white shadow-card transition-all active:scale-[0.98]"
                      onClick={() => adminSetRole(p.sessionId, "player")}
                    >
                      Joueur
                    </button>
                  </div>
                  <ConfigHint>
                    Affecte ce participant comme traqueur (chat) ou comme proie (joueur). Votre propre carte n&apos;est pas modifiable ici.
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
          <button
            type="button"
            onClick={onBeginHunt}
            disabled={(rolesReveal?.players?.length ?? 0) < 2}
            className="w-full rounded-lg bg-brand-red py-4 text-base font-bold text-white shadow-card-md transition-all disabled:opacity-40 active:opacity-90"
          >
            Démarrer la chasse
          </button>
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            En attente du démarrage par l&apos;hôte…
          </p>
        )}
          </main>
          <PartyDiscussionChrome
            desktop={isDesktop}
            open={discussionMobileOpen}
            onToggle={setDiscussionMobileOpen}
            fabBottomClass="bottom-6"
            messages={partyChatMessages}
            sessionId={sessionId}
            onSend={sendPartyChat}
            position={position}
            disabled={!socket}
          />
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
        <GameSummary summary={summary} onLeave={resetToEntry} />
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
      <div className="flex h-full min-h-0 flex-col bg-[var(--color-bg)]">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}

        <header className="z-10 hidden shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3 py-2 backdrop-blur md:flex">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {catLocked && isCat && gameState.mapUnlockAt && (
                <CatLockCountdownHeader
                  mapUnlockAt={gameState.mapUnlockAt}
                  socket={socket}
                />
              )}
              {gameState.timeLimitEndsAt && (
                <GameTimer endsAt={gameState.timeLimitEndsAt} />
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--color-text-muted)]">
              <span
                className={
                  role === "cat"
                    ? "font-bold text-brand-red"
                    : "font-bold text-brand-blue"
                }
              >
                {role === "cat" ? "Vous êtes chat" : role === "player" ? "Vous êtes joueur" : ""}
              </span>
              {me?.spectator && <span className="text-[var(--color-text-faint)]">· Spectateur</span>}
              {gameState.settings?.shrinkZoneEnabled && (
                <span className="text-violet-600 dark:text-violet-400">· Zone rétrécit</span>
              )}
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
          {!connected && (
            <span className="animate-pulse text-xs text-brand-red">Déconnecté</span>
          )}
        </header>

        <div className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3 py-2 backdrop-blur md:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {catLocked && isCat && gameState.mapUnlockAt && (
                <CatLockCountdownHeader
                  mapUnlockAt={gameState.mapUnlockAt}
                  socket={socket}
                />
              )}
              {gameState.timeLimitEndsAt && (
                <GameTimer endsAt={gameState.timeLimitEndsAt} />
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-[var(--color-text)]">
              {role === "cat" ? "Chat" : role === "player" ? "Joueur" : ""}
              {me?.spectator ? " · Spectateur" : ""}
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
        </div>

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
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => respondJoinRequest(j.requestId, true)}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
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
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setErrorBanner(null)}
            >
              OK
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="hidden shrink-0 border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90 md:flex">
          {tabBtn("map", "Carte", !showMapTab)}
          {tabBtn("players", "Joueurs")}
          {isHost && tabBtn("admin", "Admin")}
        </div>

        <div className="relative min-h-0 flex-1 bg-slate-200 pb-[5.5rem] dark:bg-slate-900 md:pb-0">
          {gameTab === "players" && (
            <div className="h-full overflow-auto p-4">
              <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Code de la partie
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                  {currentRoomCode}
                </p>
              </div>
              <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Participants
              </h2>
              <ul className="space-y-3">
                {rosterList.map((p) => (
                  <li
                    key={p.sessionId}
                    className="rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                  >
                    <span className="font-medium text-slate-900 dark:text-white">
                      {p.nickname}
                      {p.sessionId === sessionId && (
                        <span className="ml-1 text-xs text-indigo-600 dark:text-indigo-400">
                          (vous)
                        </span>
                      )}
                    </span>
                    {p.disconnected && (
                      <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                        Déconnecté
                      </span>
                    )}
                    <p
                      className={`mt-1 text-sm ${
                        p.role === "cat"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {roleBadgeText(p)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gameTab === "admin" && isHost && renderAdminPanel()}

          {gameTab === "map" && catLocked && isCat && (
            <CatMapLockOverlay
              mapUnlockAt={gameState.mapUnlockAt}
              socket={socket}
            />
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
                geoChatImages={geoChatImages}
              />
            </div>
          )}
        </div>

        <nav className="fixed bottom-[68px] left-0 right-0 z-[800] flex gap-0.5 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          {tabBtn("map", "Carte", !showMapTab, "bottom")}
          {tabBtn("players", "Joueurs", false, "bottom")}
          {isHost && tabBtn("admin", "Admin", false, "bottom")}
        </nav>

        <footer className="z-10 hidden shrink-0 gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:flex">
          {capturedPrey && sessionId && (
            <div className="flex flex-1 items-center gap-4 rounded-lg bg-[var(--color-bg-raised)] px-4 py-3 ring-1 ring-[var(--color-border)]">
              <div className="shrink-0 rounded-lg bg-[var(--color-bg)] p-2 shadow-card">
                <QRCodeSVG value={sessionId} size={88} level="M" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Je me suis fait attraper
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Spectateur · montrez encore ce QR au besoin
                </p>
              </div>
            </div>
          )}
          {isPrey && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-raised)] py-4 text-base font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border)] transition-all active:bg-[var(--color-bg-overlay)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Mon QR
            </button>
          )}
          {isCat && !catLocked && (
            <button
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setShowScan(true);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-red py-4 text-base font-bold text-white transition-all active:opacity-90"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan capture
            </button>
          )}
        </footer>

        <footer className="z-10 flex shrink-0 gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          {capturedPrey && sessionId && (
            <div className="flex w-full items-center gap-3 rounded-lg bg-[var(--color-bg-raised)] px-3 py-2 ring-1 ring-[var(--color-border)]">
              <div className="shrink-0 rounded-lg bg-[var(--color-bg)] p-1.5 shadow-card">
                <QRCodeSVG value={sessionId} size={72} level="M" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Je me suis fait attraper
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Spectateur</p>
              </div>
            </div>
          )}
          {isPrey && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-raised)] py-3 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            >
              Mon QR
            </button>
          )}
          {isCat && !catLocked && (
            <button
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setShowScan(true);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-red py-3 text-sm font-bold text-white"
            >
              Scanner capture
            </button>
          )}
        </footer>
          </div>
          <PartyDiscussionChrome
            desktop={isDesktop}
            open={discussionMobileOpen}
            onToggle={setDiscussionMobileOpen}
            fabBottomClass="bottom-[132px]"
            fabAlignClass="left-4"
            messages={partyChatMessages}
            sessionId={sessionId}
            onSend={sendPartyChat}
            position={position}
            disabled={!socket}
          />
        </div>

        {showQr && (
          <QRModal sessionId={sessionId} onClose={() => setShowQr(false)} />
        )}
        {showScan && (
          <ScannerModal
            onScan={onScanResult}
            onClose={() => setShowScan(false)}
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
