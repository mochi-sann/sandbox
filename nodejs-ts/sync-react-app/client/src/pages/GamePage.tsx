import type { Card, PublicGameState } from "../types/game";

type Props = {
  state: PublicGameState;
  onPlayCard: (cardId: string) => void;
  onDrawCard: () => void;
};

function cardLabel(card: Card): string {
  if (card.type === "number") {
    return `${card.color} ${card.value}`;
  }
  return `${card.color} ${card.type}`;
}

export function GamePage({ state, onPlayCard, onDrawCard }: Props): JSX.Element {
  const isMyTurn = state.currentPlayerId === state.myPlayerId;

  return (
    <main className="page game">
      <section className="panel">
        <h1>対戦中</h1>
        <p>現在ターン: {state.players.find((p) => p.playerId === state.currentPlayerId)?.name ?? "?"}</p>
        <p>現在色: {state.currentColor}</p>
        <p>山札: {state.drawPileCount} 枚</p>
        <p>捨て札トップ: {cardLabel(state.discardTop)}</p>

        <h2>プレイヤー</h2>
        <ul>
          {state.players.map((p) => (
            <li key={p.playerId}>
              {p.name} - 手札 {p.handCount}枚 {p.connected ? "" : "[切断/脱落]"} {p.playerId === state.currentPlayerId ? "<-" : ""}
            </li>
          ))}
        </ul>

        <h2>あなたの手札</h2>
        <div className="hand">
          {state.myHand.map((card) => (
            <button key={card.id} type="button" disabled={!isMyTurn || !!state.winnerId} onClick={() => onPlayCard(card.id)}>
              {cardLabel(card)}
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="button" disabled={!isMyTurn || !!state.winnerId} onClick={onDrawCard}>
            1枚引く
          </button>
        </div>

        {state.winnerId ? (
          <p className="result">勝者: {state.players.find((p) => p.playerId === state.winnerId)?.name ?? "Unknown"}</p>
        ) : null}
      </section>
    </main>
  );
}
