import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { addPlayer, createRoom, getRoom, removePlayer } from "./rooms.js";

const app = express();
app.use(cors({ origin: "*" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

type SignalPayload = {
  roomId: string;
  fromPlayerId: string;
  toPlayerId: string;
  signalType: "offer" | "answer" | "ice";
  data: unknown;
};

io.on("connection", (socket) => {
  socket.on("create_room", ({ name }: { name: string }, ack: (res: unknown) => void) => {
    const room = createRoom(socket.id, name || "Player");
    socket.join(room.roomId);
    ack({ ok: true, roomId: room.roomId, playerId: socket.id, hostSocketId: room.hostPlayerId });
  });

  socket.on("join_room", ({ roomId, name }: { roomId: string; name: string }, ack: (res: unknown) => void) => {
    const room = getRoom((roomId || "").toUpperCase());
    if (!room) {
      ack({ ok: false, reason: "room_not_found" });
      return;
    }
    if (room.players.length >= 4) {
      ack({ ok: false, reason: "room_full" });
      return;
    }

    addPlayer(room.roomId, socket.id, name || "Player");
    socket.join(room.roomId);

    ack({
      ok: true,
      roomId: room.roomId,
      playerId: socket.id,
      hostSocketId: room.hostPlayerId,
      participants: room.players,
    });

    socket.to(room.roomId).emit("player_joined", { roomId: room.roomId, playerId: socket.id, name: name || "Player" });
  });

  socket.on("signal", (payload: SignalPayload) => {
    io.to(payload.toPlayerId).emit("signal", payload);
  });

  socket.on("disconnect", () => {
    const removed = removePlayer(socket.id);
    if (!removed) {
      return;
    }

    if (removed.isHost) {
      io.to(removed.roomId).emit("room_closed", { roomId: removed.roomId });
      return;
    }

    socket.to(removed.roomId).emit("player_disconnected", {
      roomId: removed.roomId,
      playerId: socket.id,
    });
  });
});

const port = 3000;
httpServer.listen(port, () => {
  console.log(`signaling server listening: http://localhost:${port}`);
});
