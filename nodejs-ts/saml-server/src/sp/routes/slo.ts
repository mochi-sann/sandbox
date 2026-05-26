/**
 * Single Logout (SP 側)。
 *   GET /sp/logout : SP から SLO を開始。LogoutRequest を IdP の SLO へ送る。
 *   GET /sp/slo    : IdP からの戻り。次の2通りを処理する。
 *       - LogoutResponse : 自分が始めたログアウトの完了通知 → セッション破棄。
 *       - LogoutRequest  : IdP-initiated ログアウト → セッション破棄し LogoutResponse を返す。
 */
import type { Hono } from "hono";
import { getCookie, deleteCookie } from "hono/cookie";
import { buildRedirectUrl, parseRedirect } from "../../saml/redirect-binding";
import {
  buildLogoutRequest,
  buildLogoutResponse,
  parseLogoutRequest,
} from "../../saml/logout";
import { parseXml, selectOne } from "../../saml/xml";
import { idp, sp, spKeys, idpCertificate } from "../../config";
import { spStore } from "../store";

const loggedOutPage =
  `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif;max-width:36rem;margin:2rem auto">` +
  `<h1>ログアウトしました</h1><p><a href="/sp/login">再ログイン</a></p></body>`;

export function registerSlo(app: Hono): void {
  // SP-initiated ログアウト開始
  app.get("/sp/logout", (c) => {
    const session = spStore.getSession(getCookie(c, "sp_sid"));
    if (!session) return c.redirect("/sp/");

    const { id, xml } = buildLogoutRequest({
      issuer: sp.entityId,
      destination: idp.sloUrl,
      nameId: session.nameId,
      sessionIndex: session.sessionIndex,
    });
    spStore.rememberRequest(id);

    const url = buildRedirectUrl({
      endpoint: idp.sloUrl,
      xml,
      param: "SAMLRequest",
      privateKey: spKeys().privateKey,
    });
    return c.redirect(url);
  });

  // IdP からの戻り口
  app.get("/sp/slo", (c) => {
    const rawQuery = new URL(c.req.url).search.slice(1);
    const { xml, signatureValid } = parseRedirect(rawQuery, idpCertificate());
    if (signatureValid === false) {
      return c.text("SLO メッセージの署名検証に失敗しました", 400);
    }

    const sid = getCookie(c, "sp_sid");
    const root = selectOne("/*", parseXml(xml)) as Element | undefined;

    if (root?.localName === "LogoutRequest") {
      // IdP-initiated: こちらのセッションを破棄して応答を返す。
      const req = parseLogoutRequest(xml);
      spStore.destroySession(sid);
      deleteCookie(c, "sp_sid");

      const resp = buildLogoutResponse({
        issuer: sp.entityId,
        destination: idp.sloUrl,
        inResponseTo: req.id,
      });
      const url = buildRedirectUrl({
        endpoint: idp.sloUrl,
        xml: resp.xml,
        param: "SAMLResponse",
        privateKey: spKeys().privateKey,
      });
      return c.redirect(url);
    }

    // LogoutResponse: 自分が始めたログアウトの完了。
    spStore.destroySession(sid);
    deleteCookie(c, "sp_sid");
    return c.html(loggedOutPage);
  });
}
