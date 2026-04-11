import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useGeolocation } from "./hooks/useGeolocation.js";
import { useTheme } from "./context/ThemeContext.jsx";
import GameMap from "./components/game/GameMap.jsx";
import GameSummary from "./components/summary/GameSummary.jsx";
import QRModal from "./components/game/QRModal.jsx";
import ScannerModal from "./components/game/ScannerModal.jsx";
import { BASEMAPS } from "./lib/map/basemaps.js";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

function roleBadgeText(p) {
  if (p.spectator) return "Spectateur";
  if (p.role === "cat" && p.originalRole === "player") return "Chat (devenu chat)";
  if (p.role === "cat") return "Chat (depuis le départ)";
  if (p.role === "player" && p.originalRole === "cat") return "Joueur (ex-chat)";
  return "Joueur";
}

function HuntTimeLeft({ endsAt }) {
  const [sec, setSec] = useState(null);
  useEffect(() => {
    if (!endsAt) {
      setSec(null);
      return;
    }
    const tick = () =>
      setSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (
    <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
      ⏱ {m}:{String(s).padStart(2, "0")}
    </span>
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
        Les chats n&apos;ont pas encore accès à la carte.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-500">
        Préparez-vous… La carte s&apos;ouvrira automatiquement.
      </p>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [entryMode, setEntryMode] = useState("create");
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState("entry");
  const [nickname, setNickname] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [lobby, setLobby] = useState(null);
  const [rolesReveal, setRolesReveal] = useState(null);
  const [role, setRole] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [gameTab, setGameTab] = useState("map");
  const [adminOpen, setAdminOpen] = useState(false);
  const [mapBasemap, setMapBasemap] = useState("osm");
  const [recenterTick, setRecenterTick] = useState(0);
  const [summary, setSummary] = useState(null);

  const geoEnabled =
    stage === "lobby" || stage === "role_reveal" || stage === "game";
  const { position, error: geoError } = useGeolocation(geoEnabled);
  const lastEmit = useRef(0);

  const resetToEntry = useCallback(() => {
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
  }, []);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    setSocket(s);
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("lobby_update", (payload) => {
      setLobby(payload);
      if (payload.phase === "lobby") setStage("lobby");
    });
    s.on("roles_reveal", (payload) => {
      setRolesReveal(payload);
      setStage("role_reveal");
    });
    s.on("game_state", (payload) => {
      setGameState(payload);
      setRole((r) => payload.me?.role ?? r);
      if (payload.phase === "playing") setStage("game");
    });
    s.on("game_finished", (data) => {
      setSummary(data);
      setStage("summary");
      setGameState(null);
    });
    s.on("capture_ok", (data) => {
      setToast(`${data.preyNickname} a été capturé·e !`);
      setTimeout(() => setToast(null), 4000);
    });
    s.on("kicked", () => {
      alert("Vous avez été expulsé de la partie.");
      resetToEntry();
    });
    s.on("admin_role_changed", (data) => {
      setToast(`Rôle mis à jour : ${data.nickname} → ${data.role}`);
      setTimeout(() => setToast(null), 3500);
    });
    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, [resetToEntry]);

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
        setErrorBanner(res?.error || "Impossible de créer la salle.");
        return;
      }
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
        if (!res?.ok) setErrorBanner(res?.error || "Mise à jour refusée.");
        else if (res.lobby) setLobby(res.lobby);
      });
    },
    [socket]
  );

  const onRevealRoles = useCallback(() => {
    if (!socket) return;
    socket.emit("start_roles", {}, (res) => {
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de révéler les rôles.");
    });
  }, [socket]);

  const onBeginHunt = useCallback(() => {
    if (!socket) return;
    socket.emit("begin_hunt", {}, (res) => {
      if (!res?.ok) setErrorBanner(res?.error || "Impossible de démarrer la chasse.");
    });
  }, [socket]);

  const onScanResult = useCallback(
    (text) => {
      if (!socket || !text) return;
      const id = String(text).trim();
      socket.emit("capture_scan", { targetSessionId: id }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Capture refusée.");
        else setShowScan(false);
      });
    },
    [socket]
  );

  const adminKick = useCallback(
    (targetSessionId) => {
      if (!socket) return;
      socket.emit("admin_kick", { targetSessionId }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Expulsion refusée.");
      });
    },
    [socket]
  );

  const adminSetRole = useCallback(
    (targetSessionId, r) => {
      if (!socket) return;
      socket.emit("admin_set_role", { targetSessionId, role: r }, (res) => {
        if (!res?.ok) setErrorBanner(res?.error || "Changement refusé.");
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

  if (stage === "entry") {
    return (
      <div className="flex min-h-full flex-col p-4 pb-8">
        <header className="mb-4 flex items-start justify-between gap-3 pt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Chase GPS
            </h1>
            <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Les <strong>chats</strong> traquent les <strong>joueurs</strong>{" "}
              sur une carte. Crée une salle et partage le code, ou rejoins-en
              une avec le code reçu.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Socket : {connected ? "connecté" : "connexion…"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            title="Thème"
          >
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </button>
        </header>

        {errorBanner && (
          <div className="mb-4 rounded-xl bg-red-100 p-3 text-sm text-red-900 ring-1 ring-red-300 dark:bg-red-950/90 dark:text-red-100 dark:ring-red-800">
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
            className={`flex-1 rounded-lg py-3 text-sm font-bold ${
              entryMode === "create"
                ? "bg-white text-indigo-700 shadow dark:bg-slate-900 dark:text-indigo-300"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Créer une partie
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode("join");
              setErrorBanner(null);
            }}
            className={`flex-1 rounded-lg py-3 text-sm font-bold ${
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
            className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white active:bg-indigo-700"
          >
            Créer ma partie
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white active:bg-indigo-700"
          >
            Rejoindre la partie
          </button>
        )}
      </div>
    );
  }

  if (stage === "lobby" && lobby) {
    return (
      <div className="flex min-h-full flex-col p-4 text-slate-900 dark:text-slate-100">
        <header className="mb-4 flex shrink-0 items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Salle
            </p>
            <p className="text-3xl font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
              {lobby.code}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {isHost ? "Vous êtes l'hôte (admin)" : "En attente de l'hôte"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-bold dark:border-slate-600 dark:bg-slate-800"
          >
            {theme === "dark" ? "Clair" : "Sombre"}
          </button>
        </header>

        {errorBanner && (
          <div className="mb-3 rounded-xl bg-red-950/90 p-3 text-sm text-red-100">
            {errorBanner}
          </div>
        )}

        {geoError && (
          <div className="mb-3 rounded-xl bg-amber-950/90 p-3 text-sm text-amber-100">
            {geoError.message}
          </div>
        )}

        {!geoError && !position && (
          <div className="mb-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
            Recherche du signal GPS… Autorisez la position.
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
                  <span className="text-xs text-indigo-400">vous</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="mb-4 space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Paramètres
            </h2>
            <div>
              <label className="text-xs text-slate-500">
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
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">
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
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">
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
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-500">
                Délai carte chats (min) : {settings.catDelayMinutes ?? 5}{" "}
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
                className="mt-1 w-full"
              />
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                Options avancées
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!settings.shrinkZoneEnabled}
                  onChange={(e) =>
                    pushSettings({ shrinkZoneEnabled: e.target.checked })
                  }
                />
                Zone globale qui rétrécit dans le temps
              </label>
              {settings.shrinkZoneEnabled && (
                <div className="mt-2 space-y-2 pl-6">
                  <label className="text-xs text-slate-500">
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
                    className="w-full"
                  />
                  <label className="text-xs text-slate-500">
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
                    className="w-full"
                  />
                </div>
              )}

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!settings.timeLimitEnabled}
                  onChange={(e) =>
                    pushSettings({ timeLimitEnabled: e.target.checked })
                  }
                />
                Limite de durée de partie
              </label>
              {settings.timeLimitEnabled && (
                <div className="mt-2 pl-6">
                  <label className="text-xs text-slate-500">
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
                    className="w-full"
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
            className="mt-auto w-full rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 active:bg-emerald-700"
          >
            Révéler les rôles
          </button>
        )}
        {isHost && !lobby.canRevealRoles && (
          <p className="mt-2 text-center text-xs text-amber-400">
            Il faut au moins 2 joueurs dans la salle pour lancer la partie.
          </p>
        )}
        {isHost && lobby.canRevealRoles && !lobby.canStartGps && (
          <p className="mt-2 text-center text-xs text-amber-400">
            Au moins une position GPS est nécessaire pour le centre de la zone.
          </p>
        )}
      </div>
    );
  }

  if (stage === "role_reveal" && rolesReveal) {
    return (
      <div className="flex min-h-full flex-col p-4">
        <header className="mb-4">
          <p className="font-mono text-xl text-indigo-400">{rolesReveal.code}</p>
          <h1 className="text-xl font-bold text-white">Rôles de la partie</h1>
          <p className="text-sm text-slate-400">
            Tout le monde voit qui est chat ou joueur.
          </p>
        </header>

        {errorBanner && (
          <div className="mb-3 rounded-xl bg-red-950/90 p-3 text-sm text-red-100">
            {errorBanner}
          </div>
        )}

        <ul className="mb-6 flex-1 space-y-3">
          {rolesReveal.players?.map((p) => (
            <li
              key={p.sessionId}
              className={`rounded-xl p-4 ring-1 ${
                p.sessionId === sessionId
                  ? "bg-indigo-950/50 ring-indigo-600"
                  : "bg-slate-900/80 ring-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">
                  {p.nickname}
                  {p.sessionId === sessionId ? (
                    <span className="ml-2 text-xs text-indigo-400">(vous)</span>
                  ) : null}
                </span>
                <span
                  className={
                    p.role === "cat"
                      ? "text-orange-400"
                      : "text-sky-400"
                  }
                >
                  {p.role === "cat" ? "Chat" : "Joueur"}
                </span>
              </div>
              {isHost && p.sessionId !== sessionId && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white"
                    onClick={() => adminSetRole(p.sessionId, "cat")}
                  >
                    Forcer chat
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white"
                    onClick={() => adminSetRole(p.sessionId, "player")}
                  >
                    Forcer joueur
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-950 px-3 py-1.5 text-xs text-red-200"
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
            className="w-full rounded-xl bg-orange-600 py-4 text-base font-semibold text-white disabled:opacity-40 active:bg-orange-700"
          >
            Démarrer la chasse
          </button>
        ) : (
          <p className="text-center text-sm text-slate-500">
            En attente du démarrage par l&apos;hôte…
          </p>
        )}
      </div>
    );
  }

  if (stage === "game" && !gameState) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-slate-400">Synchronisation…</p>
        {geoError && (
          <p className="text-center text-sm text-amber-400">{geoError.message}</p>
        )}
      </div>
    );
  }

  if (stage === "summary" && summary) {
    return <GameSummary summary={summary} onLeave={resetToEntry} />;
  }

  if (stage === "game" && gameState) {
    const me = gameState.me;
    const isPrey =
      me?.role === "player" && !me?.spectator && !me?.captured;
    const isCat = me?.role === "cat" && !me?.spectator;
    const catLocked = Boolean(gameState.catMapLocked);
    const showMapTab = !catLocked || me?.role !== "cat" || me?.spectator;

    return (
      <div className="flex h-full min-h-0 flex-col">
        {toast && (
          <div className="absolute left-1/2 top-2 z-[1500] mt-2 w-[90%] max-w-sm -translate-x-1/2 rounded-xl bg-emerald-800 px-4 py-3 text-center text-sm text-white shadow-lg">
            {toast}
          </div>
        )}

        <header className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="min-w-0 pl-1">
            <p className="truncate font-mono text-sm text-indigo-600 dark:text-indigo-400">
              {rolesReveal?.code || lobby?.code || gameState.code}
            </p>
            <p className="flex flex-wrap items-center gap-x-1 text-xs text-slate-600 dark:text-slate-500">
              <span>
                {roleLabel}
                {me?.spectator ? " · Spectateur" : ""}
              </span>
              {gameState.timeLimitEndsAt ? (
                <>
                  <span>·</span>
                  <HuntTimeLeft endsAt={gameState.timeLimitEndsAt} />
                </>
              ) : null}
              {gameState.settings?.shrinkZoneEnabled ? (
                <span className="text-[10px] text-violet-600 dark:text-violet-400">
                  · zone rétrécit
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800"
              title="Thème"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-slate-800 dark:text-amber-200"
              >
                Admin
              </button>
            )}
            {geoError && (
              <span className="max-w-[100px] text-right text-[10px] text-amber-600 dark:text-amber-400">
                GPS
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

        <div className="flex shrink-0 border-b border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            disabled={!showMapTab}
            onClick={() => setGameTab("map")}
            className={`flex-1 py-3 text-sm font-semibold ${
              gameTab === "map" && showMapTab
                ? "border-b-2 border-indigo-500 text-indigo-700 dark:text-white"
                : "text-slate-500 dark:text-slate-500"
            } disabled:opacity-40`}
          >
            Carte
          </button>
          <button
            type="button"
            onClick={() => setGameTab("players")}
            className={`flex-1 py-3 text-sm font-semibold ${
              gameTab === "players"
                ? "border-b-2 border-indigo-500 text-indigo-700 dark:text-white"
                : "text-slate-500 dark:text-slate-500"
            }`}
          >
            Joueurs
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-slate-200 dark:bg-slate-950">
          {gameTab === "players" && (
            <div className="h-full overflow-auto p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-400">
                Participants
              </h2>
              <ul className="space-y-3">
                {rosterList.map((p) => (
                  <li
                    key={p.sessionId}
                    className="rounded-xl bg-slate-900/90 p-3 ring-1 ring-slate-700"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-white">
                        {p.nickname}
                        {p.sessionId === sessionId ? (
                          <span className="ml-1 text-xs text-indigo-400">
                            (vous)
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      {roleBadgeText(p)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gameTab === "map" && catLocked && isCat && (
            <CatMapLockOverlay
              mapUnlockAt={gameState.mapUnlockAt}
              socket={socket}
            />
          )}
          {gameTab === "map" && !(catLocked && isCat) && (
            <div className="relative h-full w-full">
              <div className="pointer-events-none absolute left-2 top-2 z-[1000] flex max-w-[min(100%-1rem,280px)] flex-col gap-2">
                <div className="pointer-events-auto flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-lg bg-slate-900/95 p-1.5 shadow-lg ring-1 ring-slate-600">
                  {Object.entries(BASEMAPS).map(([id, b]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMapBasemap(id)}
                      className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                        mapBasemap === id
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRecenterTick((n) => n + 1)}
                  className="pointer-events-auto rounded-lg bg-slate-900/95 px-3 py-2 text-xs font-bold text-white shadow-lg ring-1 ring-slate-600"
                >
                  Centrer sur moi
                </button>
              </div>
              <GameMap
                gameState={gameState}
                role={role}
                mySessionId={sessionId}
                basemapId={mapBasemap}
                recenterTick={recenterTick}
              />
            </div>
          )}
        </div>

        <footer className="z-10 flex shrink-0 gap-2 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          {isPrey && (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex-1 rounded-xl bg-slate-800 py-4 text-base font-semibold text-white active:bg-slate-700"
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
              className="flex-1 rounded-xl bg-orange-600 py-4 text-base font-semibold text-white active:bg-orange-700"
            >
              J&apos;ai trouvé un joueur
            </button>
          )}
        </footer>

        {showQr && (
          <QRModal sessionId={sessionId} onClose={() => setShowQr(false)} />
        )}
        {showScan && (
          <ScannerModal
            onScan={onScanResult}
            onClose={() => setShowScan(false)}
          />
        )}

        {adminOpen && (
          <div
            className="fixed inset-0 z-[1900] flex items-end justify-center bg-black/60 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Panneau admin"
          >
            <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-t-2xl bg-slate-900 p-4 shadow-xl ring-1 ring-slate-700 sm:rounded-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Admin</h2>
                <button
                  type="button"
                  className="text-slate-400"
                  onClick={() => setAdminOpen(false)}
                >
                  Fermer
                </button>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Expulser ou changer le rôle (visible par tout le monde).
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
                className="mb-4 w-full rounded-xl border border-red-800 bg-red-950/80 py-3 text-sm font-semibold text-red-100"
              >
                Fermer la partie (récap pour tous)
              </button>
              <ul className="space-y-3">
                {rosterList.map((p) => (
                  <li
                    key={p.sessionId}
                    className="rounded-xl bg-slate-950 p-3 ring-1 ring-slate-800"
                  >
                    <div className="font-medium text-white">
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
                          className="rounded-lg bg-orange-900/60 px-2 py-1.5 text-xs text-orange-100"
                          onClick={() => adminSetRole(p.sessionId, "cat")}
                        >
                          Chat
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-sky-900/60 px-2 py-1.5 text-xs text-sky-100"
                          onClick={() => adminSetRole(p.sessionId, "player")}
                        >
                          Joueur
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-950 px-2 py-1.5 text-xs text-red-200"
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
    <div className="flex min-h-full items-center justify-center p-6 text-slate-400">
      Chargement…
    </div>
  );
}
