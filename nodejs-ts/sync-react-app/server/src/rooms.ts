export type RoomPlayer = {
  playerId: string;
  name: string;
};

export type Room = {
  roomId: string;
  hostPlayerId: string;
  players: RoomPlayer[];
};

const rooms = new Map<string, Room>();

function makeRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function createRoom(hostPlayerId: string, hostName: string): Room {
  let roomId = makeRoomId();
  while (rooms.has(roomId)) {
    roomId = makeRoomId();
  }

  const room: Room = {
    roomId,
    hostPlayerId,
    players: [{ playerId: hostPlayerId, name: hostName }],
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function addPlayer(roomId: string, playerId: string, name: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) {
    return undefined;
  }
  room.players.push({ playerId, name });
  return room;
}

export function removePlayer(playerId: string): { roomId: string; isHost: boolean } | null {
  for (const [roomId, room] of rooms) {
    const idx = room.players.findIndex((p) => p.playerId === playerId);
    if (idx === -1) {
      continue;
    }

    const isHost = room.hostPlayerId === playerId;
    room.players.splice(idx, 1);

    if (room.players.length === 0 || isHost) {
      rooms.delete(roomId);
    }

    return { roomId, isHost };
  }
  return null;
}
