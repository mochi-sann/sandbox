import { LobbyPage } from "./pages/LobbyPage";
import { GamePage } from "./pages/GamePage";
import { useGameClient } from "./hooks/useGameClient";

export default function App(): JSX.Element {
  const { phase, session, gameState, error, createRoom, joinRoom, startGame, playCard, drawCard } = useGameClient();

  if (phase === "game" && gameState) {
    return <GamePage state={gameState} onPlayCard={playCard} onDrawCard={drawCard} />;
  }

  return (
    <LobbyPage
      roomId={session?.roomId ?? null}
      participants={session?.participants ?? []}
      isHost={session?.isHost ?? false}
      error={error}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onStartGame={startGame}
    />
  );
}
