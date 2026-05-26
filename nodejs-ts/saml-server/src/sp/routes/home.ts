/** 保護ページ。ログイン中ならユーザー属性を表示、未ログインならログインへ誘導。 */
import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { escapeXml } from "../../saml/xml";
import { spStore } from "../store";

export function registerHome(app: Hono): void {
  app.get("/sp/", (c) => {
    const session = spStore.getSession(getCookie(c, "sp_sid"));

    if (!session) {
      return c.html(
        `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif;max-width:36rem;margin:2rem auto">` +
          `<h1>SP (デモ・サービス)</h1><p>未ログインです。</p>` +
          `<p><a href="/sp/login">SAML でログイン (SP-initiated)</a></p></body>`,
      );
    }

    const rows = Object.entries(session.attributes)
      .map(
        ([k, v]) =>
          `<tr><th style="text-align:left;padding-right:1rem">${escapeXml(k)}</th><td>${escapeXml(v)}</td></tr>`,
      )
      .join("");

    return c.html(
      `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif;max-width:36rem;margin:2rem auto">` +
        `<h1>ログイン中</h1>` +
        `<p>NameID: <code>${escapeXml(session.nameId)}</code></p>` +
        `<table>${rows}</table>` +
        `<p style="margin-top:1.5rem"><a href="/sp/logout">ログアウト (SLO)</a></p></body>`,
    );
  });

  // ルート("/")は保護ページへ。
  app.get("/", (c) => c.redirect("/sp/"));
}
