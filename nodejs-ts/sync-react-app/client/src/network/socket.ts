import { io, type Socket } from "socket.io-client";

type Ack<T> = (payload: T) => void;

type CreateRoomResponse = { ok: true; roomId: string; playerId: string; hostSocketId: string } | { ok: false; reason: string };
type JoinRoomResponse =
  | { ok: true; roomId: string; playerId: string; hostSocketId: string; participants: { playerId: string; name: string }[] }
  | { ok: false; reason: string };

type SignalPayload = {
  roomId: string;
  fromPlayerId: string;
  toPlayerId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  signalType: "offer" | "answer" | "ice";
};

export class SignalingClient {
  private socket: Socket;

  constructor(url: string) {
    this.socket = io(url, { transports: ["websocket"] });
  }

  onConnected(cb: (id: string) => void): void {
    this.socket.on("connect", () => cb(this.socket.id ?? ""));
  }

  createRoom(name: string): Promise<CreateRoomResponse> {
    return new Promise((resolve) => {
      this.socket.emit("create_room", { name }, (res: CreateRoomResponse) => resolve(res));
    });
  }

  joinRoom(roomId: string, name: string): Promise<JoinRoomResponse> {
    return new Promise((resolve) => {
      this.socket.emit("join_room", { roomId, name }, (res: JoinRoomResponse) => resolve(res));
    });
  }

  sendSignal(payload: SignalPayload): void {
    this.socket.emit("signal", payload);
  }

  onSignal(cb: (payload: SignalPayload) => void): void {
    this.socket.on("signal", cb);
  }

  onPlayerJoined(cb: (payload: { roomId: string; playerId: string; name: string }) => void): void {
    this.socket.on("player_joined", cb);
  }

  onPlayerDisconnected(cb: (payload: { roomId: string; playerId: string }) => void): void {
    this.socket.on("player_disconnected", cb);
  }

  onPlayerReconnected(cb: (payload: { roomId: string; playerId: string }) => void): void {
    this.socket.on("player_reconnected", cb);
  }

  onRoomClosed(cb: (payload: { roomId: string }) => void): void {
    this.socket.on("room_closed", cb);
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

export type { SignalPayload, CreateRoomResponse, JoinRoomResponse, Ack };
