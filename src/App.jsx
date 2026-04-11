import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useGeolocation } from "./hooks/useGeolocation.js";
import { useTheme } from "./context/ThemeContext.jsx";
import GameMap from "./components/game/GameMap.jsx";
import GameSummary from "./components/summary/GameSummary.jsx";
import QRModal from "./components/game/QRModal.jsx";
import ScannerModal from "./components/game/ScannerModal.jsx";
import MapControls from "./components/game/MapControls.jsx";
import PlayerSheet from "./components/game/PlayerSheet.jsx";
import GameTimer from "./components/game/GameTimer.jsx";
import ZonePhaseIndicator from "./components/game/ZonePhaseIndicator.jsx";
import { NotificationContainer, useNotifications } from "./components/ui/NotificationSystem.jsx";
import LobbyShareModal from "./components/game/LobbyShareModal.jsx";
import { BASEMAPS } from "./lib/map/basemaps.js";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// localStorage keys for session persistence
const LS_SESSION_KEY = "chase_gps_session";
const LS_ROOM_KEY = "chase_gps_room";
const LS_NICKNAME_KEY = "chase_gps_nickname";
const LS_HISTORY_KEY = "chase_gps_history";

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

function saveGameHistory(summary) {
  try {
    const history = JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || "[]");
    history.unshift({
      id: Date.now(),
      code: summary.code,
      date: new Date().toISOString(),
      players: summary.players?.length || 0,
      duration: summary.endedAt - summary.huntStartedAt,
      winner: summary.winner,
    });
    // Keep only last 20 games
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.warn("Could not save history:", e);
  }
}

function loadGameHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || "[]");
  } catch {
    return [];
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
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center dark:bg-slate-950">
      <p className="text-5xl font-black tabular-nums text-orange-500 dark:text-orange-400">
        {mm}:{String(ss).padStart(2, "0")}
      </p>
      <p className="max-w-xs text-lg text-slate-800 dark:text-slate-200">
        Les chats n&apos;ont pas encore acces a la carte.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Preparez-vous... La carte s&apos;ouvrira automatiquement.
      </p>
    </div>
  );
}

// Theme toggle button component
function ThemeToggle({ theme, onToggle, size = "md" }) {
  const sizeClasses = size === "sm" 
    ? "h-9 w-9 text-sm" 
    : "px-3 py-2 text-xs";
  
  return (
    <button
      type="button"
      onClick={onToggle}
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
  const [adminOpen, setAdminOpen] = useState(false);
  const [mapBasemap, setMapBasemap] = useState("osm");
  const [recenterTick, setRecenterTick] = useState(0);
  const [zoomInTick, setZoomInTick] = useState(0);
  const [zoomOutTick, setZoomOutTick] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectError, setReconnectError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [gameHistory, setGameHistory] = useState(() => loadGameHistory());
  const [showShare, setShowShare] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const lastPingRef = useRef(Date.now());
  const socketRef = useRef(null);
  const stageRef = useRef(stage);
  const mapRef = useRef(null);
  stageRef.current = stage;

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
    setAdminOpen(false);
    setMapBasemap("osm");
    setRecenterTick(0);
    setSummary(null);
    setIsReconnecting(false);
    setReconnectAttempt(0);
    setReconnectError(null);
    setSelectedPlayer(null);
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
          setStage("lobby");
        } else if (res.phase === "role_reveal" && res.rolesReveal) {
          setRolesReveal(res.rolesReveal);
          setStage("role_reveal");
        } else if (res.phase === "playing" && res.gameState) {
          setGameState(res.gameState);
          setRole(res.gameState.me?.role ?? null);
          setStage("game");
        } else if (res.phase === "finished") {
          clearSession();
          resetToEntry(false);
        }
      } else {
        setReconnectError(res?.error || "Echec de reconnexion");
        
        if (res?.error?.includes("expiree") || res?.error?.includes("n'existe plus")) {
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
      if (saved && stageRef.current === "entry") {
        setIsReconnecting(true);
        attemptReconnect(s);
      }
    });

    s.on("disconnect", () => {
      setConnected(false);
      
      if (stageRef.current !== "entry" && stageRef.current !== "summary") {
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
      if (payload.phase === "lobby") setStage("lobby");
    });

    s.on("roles_reveal", (payload) => {
      setIsReconnecting(false);
      setRolesReveal(payload);
      setStage("role_reveal");
    });

    s.on("game_state", (payload) => {
      setIsReconnecting(false);
      setGameState(payload);
      setRole((r) => payload.me?.role ?? r);
      if (payload.phase === "playing") setStage("game");
    });

    s.on("game_finished", (data) => {
      clearSession();
      saveGameHistory(data);
      setGameHistory(loadGameHistory());
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!s.connected) {
          s.connect();
        } else if (Date.now() - lastPingRef.current > 60000) {
          s.disconnect();
          s.connect();
        } else {
          s.emit("refresh_state");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const heartbeatCheck = setInterval(() => {
      if (s.connected && Date.now() - lastPingRef.current > 90000) {
        s.disconnect();
        s.connect();
      }
    }, 30000);

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
      timeLimitEnabled: false,
      timeLimitMinutes: 30,
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

  const onJoin = useCallback(() => {
    if (!socket || !nickname.trim() || !roomCodeInput.trim()) {
      setErrorBanner("Pseudo et code requis.");
      return;
    }
    setErrorBanner(null);
    socket.emit(
      "join_room",
      { code: roomCodeInput.trim(), nickname: nickname.trim() },
      (res) => {
        if (!res?.ok) {
          setErrorBanner(res?.error || "Impossible de rejoindre.");
          return;
        }
        saveSession(res.sessionId, res.code, nickname.trim());
        setSessionId(res.sessionId);
        setIsHost(res.isHost);
        setLobby(res.lobby);
        setStage("lobby");
      }
    );
  }, [socket, nickname, roomCodeInput]);

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
      else setAdminOpen(false);
    });
  }, [socket]);

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

  useEffect(() => {
    if (!rolesReveal?.players || !sessionId) return;
    const me = rolesReveal.players.find((p) => p.sessionId === sessionId);
    if (me) setRole(me.role);
  }, [rolesReveal, sessionId]);

  const currentRoomCode = rolesReveal?.code || lobby?.code || gameState?.code || "";

  const reconnectModal = (
    <ReconnectModal
      isReconnecting={isReconnecting}
      reconnectAttempt={reconnectAttempt}
      lastError={reconnectError}
      onCancel={() => resetToEntry()}
    />
  );

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

        <div className="mb-4 flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setEntryMode("create");
              setErrorBanner(null);
            }}
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
            }}
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
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          placeholder="Votre nom"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          autoComplete="nickname"
        />

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
            />
          </>
        )}

        {entryMode === "create" ? (
          <button
            type="button"
            onClick={onCreate}
            className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            Creer ma partie
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            Rejoindre la partie
          </button>
        )}

        {/* Game history section */}
        {gameHistory.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>Historique des parties ({gameHistory.length})</span>
              <svg
                className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2">
                {gameHistory.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {game.code}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(game.date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {game.players} joueurs - {Math.floor(game.duration / 60000)} min
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Lobby screen
  if (stage === "lobby" && lobby) {
    return (
      <div className="flex min-h-full flex-col bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        
        <header className="mb-4 flex shrink-0 items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Salle</p>
            <p className="font-mono text-3xl font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              {lobby.code}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {isHost ? "Vous etes l'hote (admin)" : "En attente de l'hote"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              title="Inviter des joueurs"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Inviter
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {showShare && (
          <LobbyShareModal code={lobby.code} onClose={() => setShowShare(false)} />
        )}

        {errorBanner && (
          <div className="mb-3 rounded-xl bg-red-100 p-3 text-sm text-red-900 dark:bg-red-950/80 dark:text-red-100">
            {errorBanner}
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

        <div className="mb-4 rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Joueurs ({lobby.players?.length ?? 0})
          </h2>
          <ul className="space-y-2">
            {(lobby.players || []).map((p) => (
              <li
                key={p.sessionId}
                className="flex items-center justify-between text-slate-800 dark:text-slate-200"
              >
                <span>{p.nickname}</span>
                {p.sessionId === sessionId && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400">vous</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="mb-4 space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Parametres
            </h2>
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
                className="mt-1 w-full accent-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Delai carte chats (min) : {settings.catDelayMinutes ?? 5}{" "}
                <span className="text-slate-400">(0 = pas d&apos;attente)</span>
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
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Options avancees
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!settings.shrinkZoneEnabled}
                  onChange={(e) =>
                    pushSettings({ shrinkZoneEnabled: e.target.checked })
                  }
                  className="accent-indigo-600"
                />
                Zone globale qui retrecit dans le temps
              </label>
              {settings.shrinkZoneEnabled && (
                <div className="mt-2 space-y-2 pl-6">
                  <label className="text-xs text-slate-600 dark:text-slate-400">
                    Duree jusqu&apos;au rayon min (min) :{" "}
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
                </div>
              )}

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!settings.timeLimitEnabled}
                  onChange={(e) =>
                    pushSettings({ timeLimitEnabled: e.target.checked })
                  }
                  className="accent-indigo-600"
                />
                Limite de duree de partie
              </label>
              {settings.timeLimitEnabled && (
                <div className="mt-2 pl-6">
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
      </div>
    );
  }

  // Role reveal screen
  if (stage === "role_reveal" && rolesReveal) {
    return (
      <div className="flex min-h-full flex-col bg-slate-50 p-4 dark:bg-slate-950">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}
        
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xl text-indigo-600 dark:text-indigo-400">{rolesReveal.code}</p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Roles de la partie</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tout le monde voit qui est chat ou joueur.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Inviter
          </button>
        </header>

        {showShare && (
          <LobbyShareModal code={rolesReveal.code} onClose={() => setShowShare(false)} />
        )}

        {errorBanner && (
          <div className="mb-3 rounded-xl bg-red-100 p-3 text-sm text-red-900 dark:bg-red-950/80 dark:text-red-100">
            {errorBanner}
          </div>
        )}

        <ul className="mb-6 flex-1 space-y-3">
          {rolesReveal.players?.map((p) => (
            <li
              key={p.sessionId}
              className={`rounded-xl p-4 ring-1 ${
                p.sessionId === sessionId
                  ? "bg-indigo-50 ring-indigo-300 dark:bg-indigo-950/50 dark:ring-indigo-600"
                  : "bg-white ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-white">
                  {p.nickname}
                  {p.sessionId === sessionId ? (
                    <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">(vous)</span>
                  ) : null}
                </span>
                <span
                  className={
                    p.role === "cat"
                      ? "font-semibold text-orange-600 dark:text-orange-400"
                      : "font-semibold text-sky-600 dark:text-sky-400"
                  }
                >
                  {p.role === "cat" ? "Chat" : "Joueur"}
                </span>
              </div>
              {isHost && p.sessionId !== sessionId && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onClick={() => adminSetRole(p.sessionId, "cat")}
                  >
                    Forcer chat
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onClick={() => adminSetRole(p.sessionId, "player")}
                  >
                    Forcer joueur
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-200"
                    onClick={() => adminKick(p.sessionId)}
                  >
                    Expulser
                  </button>
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
            className="w-full rounded-xl bg-orange-600 py-4 text-base font-semibold text-white disabled:opacity-40 hover:bg-orange-700 active:bg-orange-800"
          >
            Demarrer la chasse
          </button>
        ) : (
          <p className="text-center text-sm text-slate-500">
            En attente du demarrage par l&apos;hote...
          </p>
        )}
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

    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
        <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        {reconnectModal}

        {/* Header */}
        <header className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {currentRoomCode}
              </p>
              {gameState.timeLimitEndsAt && (
                <GameTimer endsAt={gameState.timeLimitEndsAt} />
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-1 text-xs text-slate-600 dark:text-slate-400">
              <span className={role === "cat" ? "text-orange-600 dark:text-orange-400" : "text-sky-600 dark:text-sky-400"}>
                {roleLabel}
              </span>
              {me?.spectator && <span>- Spectateur</span>}
              {gameState.settings?.shrinkZoneEnabled && (
                <span className="text-violet-600 dark:text-violet-400">
                  - Zone retrecit
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Inviter / partager le code"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
              >
                Admin
              </button>
            )}
            {!connected && (
              <span className="animate-pulse text-xs text-red-500">
                Deconnecte
              </span>
            )}
          </div>
        </header>

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

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            disabled={!showMapTab}
            onClick={() => setGameTab("map")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              gameTab === "map" && showMapTab
                ? "border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                : "text-slate-500"
            } disabled:opacity-40`}
          >
            Carte
          </button>
          <button
            type="button"
            onClick={() => setGameTab("players")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              gameTab === "players"
                ? "border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                : "text-slate-500"
            }`}
          >
            Joueurs
          </button>
        </div>

        {/* Content */}
        <div className="relative min-h-0 flex-1 bg-slate-200 dark:bg-slate-900">
          {/* Players tab */}
          {gameTab === "players" && (
            <div className="h-full overflow-auto p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Participants
              </h2>
              <ul className="space-y-3">
                {rosterList.map((p) => (
                  <li
                    key={p.sessionId}
                    onClick={() => setSelectedPlayer({
                      ...p,
                      lastLocation: gameState.allies?.find(a => a.sessionId === p.sessionId) 
                        || gameState.preyForCat?.find(pr => pr.sessionId === p.sessionId)
                    })}
                    className="cursor-pointer rounded-xl bg-white p-4 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {p.nickname}
                        {p.sessionId === sessionId && (
                          <span className="ml-1 text-xs text-indigo-600 dark:text-indigo-400">
                            (vous)
                          </span>
                        )}
                        {p.disconnected && (
                          <span className="ml-1 text-xs text-red-500">
                            (deconnecte)
                          </span>
                        )}
                      </span>
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className={`mt-1 text-sm ${
                      p.role === "cat" 
                        ? "text-orange-600 dark:text-orange-400" 
                        : "text-sky-600 dark:text-sky-400"
                    }`}>
                      {roleBadgeText(p)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cat locked map */}
          {gameTab === "map" && catLocked && isCat && (
            <CatMapLockOverlay
              mapUnlockAt={gameState.mapUnlockAt}
              socket={socket}
            />
          )}

          {/* Map tab */}
          {gameTab === "map" && !(catLocked && isCat) && (
            <div className="relative h-full w-full">
              {/* Zone phase indicator */}
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

              {/* Map controls */}
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
                mapRef={mapRef}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="z-10 flex shrink-0 gap-2 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          {isPrey && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-200 py-4 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 text-base font-semibold text-white transition-colors hover:bg-orange-700 active:bg-orange-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              J&apos;ai trouve un joueur
            </button>
          )}
        </footer>

        {/* Modals */}
        {showShare && (
          <LobbyShareModal code={currentRoomCode} onClose={() => setShowShare(false)} />
        )}
        {showQr && (
          <QRModal sessionId={sessionId} onClose={() => setShowQr(false)} />
        )}
        {showScan && (
          <ScannerModal
            onScan={onScanResult}
            onClose={() => setShowScan(false)}
          />
        )}
        {selectedPlayer && (
          <PlayerSheet
            player={selectedPlayer}
            roomCode={currentRoomCode}
            onClose={() => setSelectedPlayer(null)}
          />
        )}

        {/* Admin panel */}
        {adminOpen && (
          <div
            className="fixed inset-0 z-[1900] flex items-end justify-center bg-black/60 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Panneau admin"
          >
            <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:rounded-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin</h2>
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setAdminOpen(false)}
                >
                  Fermer
                </button>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Expulser ou changer le role (visible par tout le monde).
              </p>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Terminer la partie pour tout le monde et afficher le recapitulatif ?"
                    )
                  ) {
                    adminEndGame();
                  }
                }}
                className="mb-4 w-full rounded-xl border border-red-300 bg-red-50 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100"
              >
                Fermer la partie (recap pour tous)
              </button>
              <ul className="space-y-3">
                {rosterList.map((p) => (
                  <li
                    key={p.sessionId}
                    className="rounded-xl bg-slate-100 p-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">
                      {p.nickname}
                      {p.sessionId === sessionId ? " (vous)" : ""}
                    </div>
                    <p className="text-xs text-slate-500">
                      {roleBadgeText(p)}
                    </p>
                    {p.sessionId !== sessionId && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-orange-100 px-2 py-1.5 text-xs font-medium text-orange-700 dark:bg-orange-900/60 dark:text-orange-100"
                          onClick={() => adminSetRole(p.sessionId, "cat")}
                        >
                          Chat
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-sky-100 px-2 py-1.5 text-xs font-medium text-sky-700 dark:bg-sky-900/60 dark:text-sky-100"
                          onClick={() => adminSetRole(p.sessionId, "player")}
                        >
                          Joueur
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-100 px-2 py-1.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-200"
                          onClick={() => adminKick(p.sessionId)}
                        >
                          Expulser
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
