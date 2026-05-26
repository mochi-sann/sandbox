/**
 * Single Logout (SLO) エンドポイント (IdP 側)。
 * SP からの LogoutRequest を Redirect バインディングで受け取り、
 * IdP セッションを破棄して、LogoutResponse を SP の SLO へ返す。
 */
import type { Hono } from "hono";
import { getCookie, deleteCookie } from "hono/cookie";
import { parseRedirect, buildRedirectUrl } from "../../saml/redirect-binding";
import { parseLogoutRequest, buildLogoutResponse } from "../../saml/logout";
import { idp as idpCfg, sp as spCfg, idpKeys, spCertificate } from "../../config";
import { idpStore } from "../store";

export function registerSlo(app: Hono): void {
  app.get("/idp/slo", (c) => {
    const rawQuery = new URL(c.req.url).search.slice(1);
    const { xml, relayState, signatureValid } = parseRedirect(rawQuery, spCertificate());
    if (signatureValid === false) {
      return c.text("LogoutRequest の署名検証に失敗しました", 400);
    }

    const req = parseLogoutRequest(xml);

    // IdP セッションを破棄。
    deleteCookie(c, "idp_sid");
    idpStore.destroySession(getCookie(c, "idp_sid"));

    // LogoutResponse を SP の SLO へ返す。
    const resp = buildLogoutResponse({
      issuer: idpCfg.entityId,
      destination: spCfg.sloUrl,
      inResponseTo: req.id,
    });
    const url = buildRedirectUrl({
      endpoint: spCfg.sloUrl,
      xml: resp.xml,
      param: "SAMLResponse",
      relayState,
      privateKey: idpKeys().privateKey,
    });
    return c.redirect(url);
  });
}
