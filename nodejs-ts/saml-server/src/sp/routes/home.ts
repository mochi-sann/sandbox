/** メモアプリのトップ(保護ページ)。未ログインならログインへ誘導。 */
import type { Hono } from "hono";
import { escapeXml } from "../../saml/xml";
import { currentUser } from "../auth";
import { memoStore, type Memo } from "../memos";
import type { SpSession } from "../store";

function memoRow(m: Memo): string {
  const text = escapeXml(m.text);
  const label = m.done ? `<s>${text}</s>` : text;
  return (
    `<li style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid #eee">` +
    `<form method="POST" action="/sp/memos/${m.id}/toggle" style="margin:0">` +
    `<button type="submit" title="完了切替">${m.done ? "☑" : "☐"}</button></form>` +
    `<span style="flex:1">${label}</span>` +
    `<form method="POST" action="/sp/memos/${m.id}/delete" style="margin:0">` +
    `<button type="submit" title="削除">🗑</button></form>` +
    `</li>`
  );
}

function renderApp(session: SpSession, memos: Memo[]): string {
  const role = session.attributes.role ?? "user";
  const list = memos.length
    ? `<ul style="list-style:none;padding:0">${memos.map(memoRow).join("")}</ul>`
    : `<p style="color:#888">まだメモがありません。</p>`;

  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" /><title>メモ帳 (SAML)</title>
<style>body{font-family:sans-serif;max-width:34rem;margin:2rem auto;padding:0 1rem}
header{display:flex;justify-content:space-between;align-items:baseline}
.badge{background:#eef;border-radius:.5rem;padding:.1rem .5rem;font-size:.8rem}
button{cursor:pointer}input[name=text]{width:100%;padding:.5rem}</style>
</head><body>
  <header>
    <h1>メモ帳</h1>
    <div>
      <span class="badge">${escapeXml(session.nameId)} / ${escapeXml(role)}</span>
      <a href="/sp/logout">ログアウト</a>
    </div>
  </header>
  <form method="POST" action="/sp/memos" style="display:flex;gap:.5rem;margin:1rem 0">
    <input name="text" placeholder="新しいメモ…" autofocus required />
    <button type="submit">追加</button>
  </form>
  ${list}
</body></html>`;
}

export function registerHome(app: Hono): void {
  app.get("/sp/", (c) => {
    const session = currentUser(c);
    if (!session) {
      return c.html(
        `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif;max-width:34rem;margin:2rem auto">` +
          `<h1>メモ帳 (SAML デモ)</h1><p>このアプリは SAML でログインします。</p>` +
          `<p><a href="/sp/login">SAML でログイン</a></p>` +
          `<p style="color:#888;font-size:.85rem">テスト: alice / password, bob / password</p></body>`,
      );
    }
    return c.html(renderApp(session, memoStore.list(session.nameId)));
  });

  // ルート("/")はアプリへ。
  app.get("/", (c) => c.redirect("/sp/"));
}
