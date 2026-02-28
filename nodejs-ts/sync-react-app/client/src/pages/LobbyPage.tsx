import { useState } from "react";

type Participant = { playerId: string; name: string; connected: boolean; isHost: boolean };

type Props = {
  roomId: string | null;
  participants: Participant[];
  isHost: boolean;
  error: string | null;
  onCreateRoom: (name: string) => Promise<void>;
  onJoinRoom: (roomId: string, name: string) => Promise<void>;
  onStartGame: () => void;
};

export function LobbyPage({ roomId, participants, isHost, error, onCreateRoom, onJoinRoom, onStartGame }: Props): JSX.Element {
  const [name, setName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  return (
    <main className="page">
      <section className="panel">
        <h1>UNO風マルチゲーム</h1>
        <p>招待ルーム制 / 2〜4人 / WebRTC同期</p>

        {!roomId ? (
          <>
            <label>
              名前
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Player" />
            </label>
            <div className="actions">
              <button type="button" onClick={() => void onCreateRoom(name || "Player")}>ルーム作成</button>
            </div>
            <hr />
            <label>
              ルームID
              <input value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())} placeholder="ABC123" />
            </label>
            <div className="actions">
              <button type="button" onClick={() => void onJoinRoom(joinRoomId, name || "Player")}>参加</button>
            </div>
          </>
        ) : (
          <>
            <h2>ルームID: {roomId}</h2>
            <ul>
              {participants.map((p) => (
                <li key={p.playerId}>
                  {p.name} {p.isHost ? "(Host)" : ""} {p.connected ? "" : "[切断]"}
                </li>
              ))}
            </ul>
            {isHost ? <button type="button" onClick={onStartGame}>ゲーム開始</button> : <p>ホストの開始を待っています...</p>}
          </>
        )}

        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
