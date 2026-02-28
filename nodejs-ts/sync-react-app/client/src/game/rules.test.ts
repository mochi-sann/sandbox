import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, isPlayable } from "./rules";
import type { Card } from "../types/game";

describe("isPlayable", () => {
  const top: Card = { id: "top", color: "red", type: "number", value: 5 };

  it("同色カードは出せる", () => {
    expect(isPlayable({ id: "a", color: "red", type: "number", value: 9 }, top, "red")).toBe(true);
  });

  it("同数字カードは出せる", () => {
    expect(isPlayable({ id: "a", color: "blue", type: "number", value: 5 }, top, "red")).toBe(true);
  });

  it("不一致は出せない", () => {
    expect(isPlayable({ id: "a", color: "green", type: "number", value: 1 }, top, "red")).toBe(false);
  });
});

describe("applyAction", () => {
  it("手札0で勝利になる", () => {
    const state = createInitialState("R", [
      { playerId: "p1", name: "A", isHost: true },
      { playerId: "p2", name: "B", isHost: false },
    ]);

    const last = state.hands.p1[0];
    state.hands.p1 = [last];
    state.currentPlayerId = "p1";
    state.discardPile[state.discardPile.length - 1] = { id: "t", color: last.color, type: "number", value: last.value ?? 0 };
    state.currentColor = last.color;

    const next = applyAction(state, { type: "play_card", playerId: "p1", cardId: last.id });
    expect(next.winnerId).toBe("p1");
  });
});
