import type { Card, ClientAction, HostInternalState, PublicGameState } from "../types/game";
import { createDeck } from "./deck";

const INITIAL_HAND_SIZE = 7;

function nextPlayerId(state: HostInternalState): string {
  const ids = state.players.map((p) => p.playerId);
  const currentIndex = ids.indexOf(state.currentPlayerId);
  const forward = state.direction === "clockwise" ? 1 : -1;
  for (let step = 1; step <= ids.length; step += 1) {
    const nextIndex = (currentIndex + forward * step + ids.length) % ids.length;
    const candidate = ids[nextIndex];
    if (!state.eliminatedPlayerIds.includes(candidate)) {
      return candidate;
    }
  }
  return state.currentPlayerId;
}

export function isPlayable(card: Card, topCard: Card, currentColor: Card["color"]): boolean {
  if (card.color === currentColor) {
    return true;
  }
  if (card.type === "number" && topCard.type === "number") {
    return card.value === topCard.value;
  }
  return card.type === topCard.type;
}

function drawOne(state: HostInternalState, playerId: string): void {
  if (state.drawPile.length === 0) {
    const keepTop = state.discardPile[state.discardPile.length - 1];
    const recycle = state.discardPile.slice(0, -1);
    state.drawPile = recycle.sort(() => Math.random() - 0.5);
    state.discardPile = [keepTop];
  }

  const card = state.drawPile.pop();
  if (!card) {
    return;
  }
  state.hands[playerId].push(card);
}

export function createInitialState(roomId: string, players: { playerId: string; name: string; isHost: boolean }[]): HostInternalState {
  const deck = createDeck();
  const hands: Record<string, Card[]> = {};

  for (const player of players) {
    hands[player.playerId] = [];
  }

  for (let i = 0; i < INITIAL_HAND_SIZE; i += 1) {
    for (const player of players) {
      const c = deck.pop();
      if (c) {
        hands[player.playerId].push(c);
      }
    }
  }

  let top = deck.pop();
  while (top && top.type !== "number") {
    deck.unshift(top);
    top = deck.pop();
  }
  if (!top) {
    throw new Error("Failed to initialize discard pile");
  }

  return {
    roomId,
    players: players.map((p) => ({ ...p, connected: true })),
    eliminatedPlayerIds: [],
    hands,
    drawPile: deck,
    discardPile: [top],
    currentColor: top.color,
    currentPlayerId: players[0].playerId,
    direction: "clockwise",
    winnerId: null,
    started: true,
  };
}

export function applyAction(state: HostInternalState, action: ClientAction): HostInternalState {
  if (state.winnerId) {
    return state;
  }
  if (action.playerId !== state.currentPlayerId) {
    return state;
  }

  if (action.type === "draw_card") {
    drawOne(state, action.playerId);
    state.currentPlayerId = nextPlayerId(state);
    return state;
  }

  const top = state.discardPile[state.discardPile.length - 1];
  const hand = state.hands[action.playerId];
  const idx = hand.findIndex((c) => c.id === action.cardId);
  if (idx === -1) {
    return state;
  }

  const card = hand[idx];
  if (!isPlayable(card, top, state.currentColor)) {
    return state;
  }

  hand.splice(idx, 1);
  state.discardPile.push(card);
  state.currentColor = card.color;

  if (hand.length === 0) {
    state.winnerId = action.playerId;
    return state;
  }

  if (card.type === "reverse") {
    state.direction = state.direction === "clockwise" ? "counterclockwise" : "clockwise";
    if (state.players.length === 2) {
      state.currentPlayerId = nextPlayerId(state);
      state.currentPlayerId = nextPlayerId(state);
      return state;
    }
  }

  state.currentPlayerId = nextPlayerId(state);

  if (card.type === "skip") {
    state.currentPlayerId = nextPlayerId(state);
  }

  return state;
}

export function eliminatePlayer(state: HostInternalState, playerId: string): HostInternalState {
  if (state.eliminatedPlayerIds.includes(playerId) || state.winnerId) {
    return state;
  }
  state.eliminatedPlayerIds.push(playerId);

  const active = state.players
    .map((p) => p.playerId)
    .filter((id) => !state.eliminatedPlayerIds.includes(id));
  if (active.length === 1) {
    state.winnerId = active[0];
    return state;
  }

  if (state.currentPlayerId === playerId) {
    state.currentPlayerId = nextPlayerId(state);
  }
  return state;
}

export function toPublicState(state: HostInternalState, viewerId: string): PublicGameState {
  const top = state.discardPile[state.discardPile.length - 1];

  return {
    roomId: state.roomId,
    players: state.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      connected: p.connected && !state.eliminatedPlayerIds.includes(p.playerId),
      isHost: p.isHost,
      handCount: state.hands[p.playerId]?.length ?? 0,
    })),
    myPlayerId: viewerId,
    myHand: [...(state.hands[viewerId] ?? [])],
    discardTop: top,
    drawPileCount: state.drawPile.length,
    currentColor: state.currentColor,
    currentPlayerId: state.currentPlayerId,
    direction: state.direction,
    winnerId: state.winnerId,
    started: state.started,
  };
}
