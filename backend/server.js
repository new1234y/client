import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createRoomsStore } from "./rooms.js";
import { corsOriginOption } from "./corsConfig.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOrigin = corsOriginOption(CLIENT_ORIGIN);

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ["GET", "POST"] },
  pingInterval: 25000,
  pingTimeout: 20000,
});

const store = createRoomsStore();

// Map sessionId -> { socketId, roomCode, nickname, ... } pour la reconnexion
const sessionRegistry = new Map();

io.on("connection", (socket) => {
  // Heartbeat: envoie ping toutes les 30s, le client doit repondre pong
  const heartbeatInterval = setInterval(() => {
    socket.emit("server_ping", { t: Date.now() });
  }, 30000);

  socket.on("client_pong", () => {
    // Le client est vivant
  });



  // Reconnexion avec sessionId existant
  socket.on("reconnect_session", ({ sessionId, roomCode }, cb) => {
    try {
      const savedSession = sessionRegistry.get(sessionId);
      if (!savedSession) {
        cb?.({ ok: false, error: "Session expirée ou inexistante." });
        return;
      }

      const room = store.getRoomByCode(roomCode);
      if (!room) {
        sessionRegistry.delete(sessionId);
        cb?.({ ok: false, error: "La salle n'existe plus." });
        return;
      }

      // Trouver l'ancien joueur par sessionId et mettre a jour son socketId
      let foundPlayer = null;
      for (const p of room.players.values()) {
        if (p.sessionId === sessionId) {
          foundPlayer = p;
          break;
        }
      }

      if (!foundPlayer) {
        sessionRegistry.delete(sessionId);
        cb?.({ ok: false, error: "Joueur non trouvé dans la salle." });
        return;
      }

      // Nettoyer l'ancien socket s'il existe encore
      const oldSocketId = foundPlayer.socketId;
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.leave(room.code);
        }
        room.players.delete(oldSocketId);
        store.socketToRoom.delete(oldSocketId);
      }

      // Mettre a jour avec le nouveau socket
      foundPlayer.socketId = socket.id;
      room.players.set(socket.id, foundPlayer);
      store.socketToRoom.set(socket.id, room.code);
      socket.join(room.code);

      // Mettre a jour le registre de session
      sessionRegistry.set(sessionId, {
        socketId: socket.id,
        roomCode: room.code,
        nickname: foundPlayer.nickname,
      });

      const isHost = room.hostId === oldSocketId;
      if (isHost) {
        room.hostId = socket.id;
      }

      // Envoyer l'etat actuel selon la phase
      let payload;
      if (room.phase === "lobby") {
        payload = store.buildLobbyPayload(room);
        io.to(room.code).emit("lobby_update", payload);
      } else if (room.phase === "role_reveal") {
        payload = store.buildRolesRevealPayload(room);
        io.to(room.code).emit("roles_reveal", payload);
      } else if (room.phase === "playing") {
        store.broadcastPlayingState(io, room);
        payload = store.buildPlayingPayloadForSocket(room, socket.id);
      }

      cb?.({
        ok: true,
        code: room.code,
        sessionId: foundPlayer.sessionId,
        isHost: room.hostId === socket.id,
        phase: room.phase,
        lobby: room.phase === "lobby" ? payload : null,
        rolesReveal: room.phase === "role_reveal" ? payload : null,
        gameState: room.phase === "playing" ? payload : null,
      });
    } catch (e) {
      console.error("Erreur reconnect_session:", e);
      cb?.({ ok: false, error: "Erreur serveur." });
    }
  });

  socket.on("create_room", ({ nickname }, cb) => {
    try {
      const { room, player } = store.createRoom(socket.id, nickname);
      socket.join(room.code);
      
      // Enregistrer la session pour la reconnexion
      sessionRegistry.set(player.sessionId, {
        socketId: socket.id,
        roomCode: room.code,
        nickname: player.nickname,
      });

      const payload = store.buildLobbyPayload(room);
      io.to(room.code).emit("lobby_update", payload);
      cb?.({
        ok: true,
        code: room.code,
        sessionId: player.sessionId,
        isHost: true,
        lobby: payload,
      });
    } catch (e) {
      console.error(e);
      cb?.({ ok: false, error: "Erreur serveur." });
    }
  });

  socket.on("join_room", ({ code, nickname }, cb) => {
    const result = store.joinRoom(socket.id, code, nickname);
    if (result.error) {
      cb?.({ ok: false, error: result.error });
      return;
    }
    const { room, player } = result;
    socket.join(room.code);

    // Enregistrer la session pour la reconnexion
    sessionRegistry.set(player.sessionId, {
      socketId: socket.id,
      roomCode: room.code,
      nickname: player.nickname,
    });

    const payload = store.buildLobbyPayload(room);
    io.to(room.code).emit("lobby_update", payload);
    cb?.({
      ok: true,
      code: room.code,
      sessionId: player.sessionId,
      isHost: room.hostId === socket.id,
      lobby: payload,
    });
  });

  socket.on("update_settings", (partial, cb) => {
    const out = store.updateSettings(socket.id, partial);
    if (out.error) {
      cb?.({ ok: false, error: out.error });
      return;
    }
    const payload = store.buildLobbyPayload(out.room);
    io.to(out.room.code).emit("lobby_update", payload);
    cb?.({ ok: true, lobby: payload });
  });

  /** Étape 1 : tirage + écran révélation */
  socket.on("start_roles", (_data, cb) => {
    const out = store.startRoles(socket.id);
    if (out.error) {
      cb?.({ ok: false, error: out.error });
      return;
    }
    const { room } = out;
    io.to(room.code).emit("roles_reveal", store.buildRolesRevealPayload(room));
    cb?.({ ok: true });
  });

  /** Étape 2 : la chasse commence (délai carte pour les chats) */
  socket.on("begin_hunt", (_data, cb) => {
    const out = store.beginHunt(socket.id);
    if (out.error) {
      cb?.({ ok: false, error: out.error });
      return;
    }
    const { room } = out;
    store.broadcastPlayingState(io, room);
    cb?.({ ok: true });
  });

  socket.on("refresh_state", () => {
    const code = store.socketToRoom.get(socket.id);
    if (!code) return;
    const room = store.getRoomByCode(code);
    if (room?.phase === "playing") {
      store.broadcastPlayingState(io, room);
    }
  });

  socket.on("admin_kick", ({ targetSessionId }, cb) => {
    const r = store.adminKick(io, socket.id, targetSessionId);
    if (r.error) cb?.({ ok: false, error: r.error });
    else cb?.({ ok: true });
  });

  socket.on("admin_set_role", ({ targetSessionId, role }, cb) => {
    const r = store.adminSetRole(io, socket.id, targetSessionId, role);
    if (r.error) cb?.({ ok: false, error: r.error });
    else cb?.({ ok: true });
  });

  socket.on("admin_end_game", (_data, cb) => {
    const r = store.adminEndGame(io, socket.id);
    if (r.error) cb?.({ ok: false, error: r.error });
    else cb?.({ ok: true });
  });

  socket.on("position", ({ lat, lng }) => {
    const ctx = store.setPosition(socket.id, lat, lng);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase === "lobby") {
      io.to(room.code).emit("lobby_update", store.buildLobbyPayload(room));
      return;
    }
    if (room.phase === "role_reveal") {
      io.to(room.code).emit("roles_reveal", store.buildRolesRevealPayload(room));
      return;
    }
    if (room.phase === "playing") {
      store.appendLocationSample(room, player);
      store.broadcastPlayingState(io, room);
    }
  });

  socket.on("capture_scan", ({ targetSessionId }, cb) => {
    const r = store.tryCapture(io, socket.id, targetSessionId);
    if (r.error) cb?.({ ok: false, error: r.error });
    else cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    clearInterval(heartbeatInterval);
    
    const code = store.socketToRoom.get(socket.id);
    if (!code) return;
    
    const room = store.getRoomByCode(code);
    if (!room) {
      store.socketToRoom.delete(socket.id);
      return;
    }

    // Pendant une partie active, on garde le joueur (possibilite de reconnexion)
    // On le marque juste comme deconnecte temporairement
    const player = room.players.get(socket.id);
    if (player && (room.phase === "playing" || room.phase === "role_reveal")) {
      player.disconnectedAt = Date.now();
      // Broadcast l'etat mis a jour
      if (room.phase === "role_reveal") {
        io.to(code).emit("roles_reveal", store.buildRolesRevealPayload(room));
      } else if (room.phase === "playing") {
        store.broadcastPlayingState(io, room);
      }
      return;
    }

    // En lobby, on supprime le joueur
    store.leaveRoom(socket.id);
    if (room.players.size > 0) {
      io.to(code).emit("lobby_update", store.buildLobbyPayload(room));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Serveur chase-gps sur http://${HOST}:${PORT}`);
});
