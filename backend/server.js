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
});

const store = createRoomsStore();

io.on("connection", (socket) => {
  socket.on("create_room", ({ nickname }, cb) => {
    try {
      const { room, player } = store.createRoom(socket.id, nickname);
      socket.join(room.code);
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
    const code = store.socketToRoom.get(socket.id);
    store.leaveRoom(socket.id);
    if (code) {
      const room = store.getRoomByCode(code);
      if (room) {
        if (room.phase === "lobby") {
          io.to(code).emit("lobby_update", store.buildLobbyPayload(room));
        } else if (room.phase === "role_reveal") {
          io.to(code).emit("roles_reveal", store.buildRolesRevealPayload(room));
        } else if (room.phase === "playing") {
          store.broadcastPlayingState(io, room);
        }
      }
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Serveur chase-gps sur http://${HOST}:${PORT}`);
});
