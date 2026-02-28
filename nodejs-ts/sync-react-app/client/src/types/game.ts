export type Color = "red" | "blue" | "green" | "yellow";

export type CardType = "number" | "skip" | "reverse";

export type Card = {
  id: string;
  color: Color;
  type: CardType;
  value?: number;
};

export type Player = {
  playerId: string;
  name: string;
  handCount: number;
  connected: boolean;
  isHost: boolean;
};

export type PublicGameState = {
  roomId: string;
  players: Player[];
  myPlayerId: string;
  myHand: Card[];
  discardTop: Card;
  drawPileCount: number;
  currentColor: Color;
  currentPlayerId: string;
  direction: "clockwise" | "counterclockwise";
  winnerId: string | null;
  started: boolean;
};

export type PlayCardAction = {
  type: "play_card";
  playerId: string;
  cardId: string;
};

export type DrawCardAction = {
  type: "draw_card";
  playerId: string;
};

export type ClientAction = PlayCardAction | DrawCardAction;

export type HostInternalState = {
  roomId: string;
  players: { playerId: string; name: string; connected: boolean; isHost: boolean }[];
  eliminatedPlayerIds: string[];
  hands: Record<string, Card[]>;
  drawPile: Card[];
  discardPile: Card[];
  currentColor: Color;
  currentPlayerId: string;
  direction: "clockwise" | "counterclockwise";
  winnerId: string | null;
  started: boolean;
};
