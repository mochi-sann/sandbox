/**
 * ログインフォーム。
 *   GET  /idp/login?rid=... : ユーザー名/パスワード入力フォームを表示。
 *   POST /idp/login         : 認証し、IdP セッションを確立。保存しておいた SSO 要求
 *                             (rid) があれば Response を発行して SP へ自動 POST する。
 */
import type { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { escapeXml } from "../../saml/xml";
import { genId } from "../../saml/ids";
import { authenticate } from "../users";
import { idpStore } from "../store";
import { issueResponseForm } from "../issue";

function loginPage(rid: string, error?: string): string {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" /><title>IdP ログイン</title>
<style>body{font-family:sans-serif;max-width:24rem;margin:3rem auto}label{display:block;margin:.5rem 0 .2rem}
input{width:100%;padding:.4rem}button{margin-top:1rem;padding:.5rem 1rem}.err{color:#c00}.hint{color:#666;font-size:.85rem}</style>
</head><body>
  <h1>IdP ログイン</h1>
  ${error ? `<p class="err">${escapeXml(error)}</p>` : ""}
  <form method="POST" action="/idp/login">
    <input type="hidden" name="rid" value="${escapeXml(rid)}" />
    <label>ユーザー名</label><input name="username" autofocus />
    <label>パスワード</label><input name="password" type="password" />
    <button type="submit">ログイン</button>
  </form>
  <p class="hint">テスト用: alice / password, bob / password</p>
</body></html>`;
}

export function registerLogin(app: Hono): void {
  app.get("/idp/login", (c) => {
    const rid = c.req.query("rid") ?? "";
    return c.html(loginPage(rid));
  });

  app.post("/idp/login", async (c) => {
    const body = await c.req.parseBody();
    const username = String(body["username"] ?? "");
    const password = String(body["password"] ?? "");
    const rid = String(body["rid"] ?? "");

    const user = authenticate(username, password);
    if (!user) {
      return c.html(loginPage(rid, "ユーザー名またはパスワードが違います"), 401);
    }

    // IdP セッションを確立 (SessionIndex は SLO で使う)。
    const sessionIndex = genId();
    const sid = idpStore.createSession({ user, sessionIndex });
    setCookie(c, "idp_sid", sid, { httpOnly: true, path: "/", sameSite: "Lax" });

    // 保存しておいた SSO 要求があれば Response を発行。
    const pending = idpStore.takePending(rid);
    if (pending) {
      return c.html(issueResponseForm(user, pending, sessionIndex));
    }

    // 単独ログイン(SSO 要求なし)。
    return c.html(
      `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif">` +
        `<p>${escapeXml(user.nameId)} としてログインしました。</p>` +
        `<p><a href="/idp/init">SP へ SSO する (IdP-initiated)</a></p></body>`,
    );
  });
}
