import { useCallback, useEffect, useRef, useState } from "react";
import { applyAction, createInitialState, eliminatePlayer, toPublicState } from "../game/rules";
import { SignalingClient } from "../network/socket";
import { WebRtcManager } from "../network/webrtc";
import type { ClientAction, HostInternalState, PublicGameState } from "../types/game";

type Participant = { playerId: string; name: string; connected: boolean; isHost: boolean };

type Session = {
  roomId: string;
  myPlayerId: string;
  hostPlayerId: string;
  isHost: boolean;
  participants: Participant[];
};

type Phase = "lobby" | "game";

type UseGameClient = {
  phase: Phase;
  session: Session | null;
  gameState: PublicGameState | null;
  error: string | null;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (roomId: string, name: string) => Promise<void>;
  startGame: () => void;
  playCard: (cardId: string) => void;
  drawCard: () => void;
};

const SIGNAL_URL = "http://localhost:3000";
const DISCONNECT_LOSE_MS = 60_000;

export function useGameClient(): UseGameClient {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [session, setSession] = useState<Session | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const rtcRef = useRef<WebRtcManager | null>(null);
  const hostStateRef = useRef<HostInternalState | null>(null);
  const disconnectTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const sendStateIfHost = useCallback(() => {
    const s = sessionRef.current;
    const rtc = rtcRef.current;
    const internal = hostStateRef.current;
    if (!s?.isHost || !rtc || !internal) {
      return;
    }

    for (const p of internal.players) {
      const pub = toPublicState(internal, p.playerId);
      if (p.playerId === s.myPlayerId) {
        setGameState(pub);
      } else {
        rtc.sendToPeer(p.playerId, { type: "state_snapshot", payload: pub });
      }
    }
  }, []);

  useEffect(() => {
    const signaling = new SignalingClient(SIGNAL_URL);
    signalingRef.current = signaling;

    signaling.onSignal(async (payload) => {
      await rtcRef.current?.handleSignal(payload.fromPlayerId, payload.signalType, payload.data);
    });

    signaling.onPlayerJoined(async ({ roomId, playerId, name }) => {
      const current = sessionRef.current;
      if (!current || current.roomId !== roomId) {
        return;
      }

      setSession((prev) => {
        if (!prev || prev.participants.some((p) => p.playerId === playerId)) {
          return prev;
        }
        return {
          ...prev,
          participants: [...prev.participants, { playerId, name, connected: true, isHost: false }],
        };
      });

      if (current.isHost) {
        await rtcRef.current?.hostCreatePeer(playerId);
      }
    });

    signaling.onPlayerDisconnected(({ roomId, playerId }) => {
      const current = sessionRef.current;
      if (!current || current.roomId !== roomId) {
        return;
      }

      setSession((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          participants: prev.participants.map((p) => (p.playerId === playerId ? { ...p, connected: false } : p)),
        };
      });

      if (current.isHost && hostStateRef.current) {
        const target = hostStateRef.current.players.find((p) => p.playerId === playerId);
        if (target) {
          target.connected = false;
        }

        const id = window.setTimeout(() => {
          if (!hostStateRef.current) {
            return;
          }
          eliminatePlayer(hostStateRef.current, playerId);
          sendStateIfHost();
        }, DISCONNECT_LOSE_MS);

        disconnectTimersRef.current.set(playerId, id);
        sendStateIfHost();
      }
    });

    signaling.onPlayerReconnected(({ roomId, playerId }) => {
      const current = sessionRef.current;
      if (!current || current.roomId !== roomId) {
        return;
      }

      setSession((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          participants: prev.participants.map((p) => (p.playerId === playerId ? { ...p, connected: true } : p)),
        };
      });

      const timerId = disconnectTimersRef.current.get(playerId);
      if (timerId) {
        clearTimeout(timerId);
        disconnectTimersRef.current.delete(playerId);
      }

      if (current.isHost && hostStateRef.current) {
        const target = hostStateRef.current.players.find((p) => p.playerId === playerId);
        if (target) {
          target.connected = true;
        }
        sendStateIfHost();
      }
    });

    signaling.onRoomClosed(() => {
      setError("ホスト切断のためルームが終了しました");
      setSession(null);
      setPhase("lobby");
      setGameState(null);
      hostStateRef.current = null;
    });

    return () => {
      disconnectTimersRef.current.forEach((id) => clearTimeout(id));
      signaling.disconnect();
    };
  }, [sendStateIfHost]);

  async function setupRtc(isHost: boolean, roomId: string, myPlayerId: string): Promise<void> {
    if (!signalingRef.current) {
      return;
    }

    const rtc = new WebRtcManager(isHost, (toPlayerId, signalType, data) => {
      signalingRef.current?.sendSignal({
        roomId,
        fromPlayerId: myPlayerId,
        toPlayerId,
        signalType,
        data,
      });
    });

    rtc.setHandlers((_fromPlayerId, message) => {
      if (typeof message !== "object" || message === null) {
        return;
      }

      const data = message as { type?: string; payload?: unknown };
      if (isHost) {
        if (data.type === "action") {
          const action = data.payload as ClientAction;
          if (!hostStateRef.current) {
            return;
          }
          hostStateRef.current = applyAction(hostStateRef.current, action);
          sendStateIfHost();
        }
        return;
      }

      if (data.type === "state_snapshot") {
        setGameState(data.payload as PublicGameState);
        setPhase("game");
      }
    }, () => {
      // noop
    });

    rtcRef.current = rtc;
  }

  async function createRoom(name: string): Promise<void> {
    if (!signalingRef.current) {
      return;
    }

    const normalizedName = name.trim() || "Player";
    const result = await signalingRef.current.createRoom(normalizedName);
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    await setupRtc(true, result.roomId, result.playerId);
    setSession({
      roomId: result.roomId,
      myPlayerId: result.playerId,
      hostPlayerId: result.hostSocketId,
      isHost: true,
      participants: [{ playerId: result.playerId, name: normalizedName, connected: true, isHost: true }],
    });
    setError(null);
  }

  async function joinRoom(roomId: string, name: string): Promise<void> {
    if (!signalingRef.current) {
      return;
    }

    const normalizedName = name.trim() || "Player";
    const result = await signalingRef.current.joinRoom(roomId.toUpperCase(), normalizedName);
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    await setupRtc(false, result.roomId, result.playerId);
    setSession({
      roomId: result.roomId,
      myPlayerId: result.playerId,
      hostPlayerId: result.hostSocketId,
      isHost: false,
      participants: result.participants.map((p) => ({ ...p, connected: true, isHost: p.playerId === result.hostSocketId })),
    });
    setError(null);
  }

  function startGame(): void {
    const current = sessionRef.current;
    if (!current?.isHost) {
      return;
    }
    if (current.participants.length < 2) {
      setError("開始には2人以上必要です");
      return;
    }

    hostStateRef.current = createInitialState(
      current.roomId,
      current.participants.map((p) => ({ playerId: p.playerId, name: p.name, isHost: p.isHost })),
    );
    setPhase("game");
    sendStateIfHost();
  }

  function playCard(cardId: string): void {
    const current = sessionRef.current;
    if (!current || !gameState) {
      return;
    }

    const action: ClientAction = { type: "play_card", playerId: current.myPlayerId, cardId };
    if (current.isHost) {
      if (!hostStateRef.current) {
        return;
      }
      hostStateRef.current = applyAction(hostStateRef.current, action);
      sendStateIfHost();
      return;
    }

    rtcRef.current?.sendToPeer(current.hostPlayerId, { type: "action", payload: action });
  }

  function drawCard(): void {
    const current = sessionRef.current;
    if (!current || !gameState) {
      return;
    }

    const action: ClientAction = { type: "draw_card", playerId: current.myPlayerId };
    if (current.isHost) {
      if (!hostStateRef.current) {
        return;
      }
      hostStateRef.current = applyAction(hostStateRef.current, action);
      sendStateIfHost();
      return;
    }

    rtcRef.current?.sendToPeer(current.hostPlayerId, { type: "action", payload: action });
  }

  return {
    phase,
    session,
    gameState,
    error,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    drawCard,
  };
}
