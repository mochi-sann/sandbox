import type { Card, Color } from "../types/game";

const COLORS: Color[] = ["red", "blue", "green", "yellow"];

function cardId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const color of COLORS) {
    for (let value = 0; value <= 9; value += 1) {
      deck.push({ id: cardId(), color, type: "number", value });
      if (value !== 0) {
        deck.push({ id: cardId(), color, type: "number", value });
      }
    }

    for (let i = 0; i < 2; i += 1) {
      deck.push({ id: cardId(), color, type: "skip" });
      deck.push({ id: cardId(), color, type: "reverse" });
    }
  }

  return shuffle(deck);
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
