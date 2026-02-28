# Sync React UNO-like Game (MVP)

React + WebRTC DataChannel + Socket.IO signaling で動く、招待ルーム制のUNO風カードゲームです。

## 構成

- `client`: React + TypeScript (Vite)
- `server`: Node.js + Socket.IO (signaling only)

## ルール（MVP）

- 2〜4人
- 色一致 or 数字一致でカードを出せる
- 特殊カード: `Skip`, `Reverse`
- UNO宣言なし
- 手札0枚で即勝利
- 切断後60秒で敗北扱い（ホスト判定）

## 起動

```bash
npm install
npm run dev:server
npm run dev:client
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3000`

## 備考

- ゲーム状態はホスト権威型で管理されます。
- 永続化は行いません（メモリのみ）。
