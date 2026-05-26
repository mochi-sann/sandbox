/**
 * SP-initiated SSO の開始点。
 * AuthnRequest を生成し、HTTP-Redirect バインディング(クエリ署名つき)で IdP の SSO へ送る。
 * 送った AuthnRequest の ID は覚えておき、後で Response の InResponseTo と突合する。
 */
import type { Hono } from "hono";
import { buildAuthnRequest } from "../../saml/authn-request";
import { buildRedirectUrl } from "../../saml/redirect-binding";
import { idp, sp, spKeys } from "../../config";
import { spStore } from "../store";

export function registerLogin(app: Hono): void {
  app.get("/sp/login", (c) => {
    const { id, xml } = buildAuthnRequest({
      issuer: sp.entityId,
      destination: idp.ssoUrl,
      acsUrl: sp.acsUrl,
    });
    spStore.rememberRequest(id);

    const url = buildRedirectUrl({
      endpoint: idp.ssoUrl,
      xml,
      param: "SAMLRequest",
      relayState: "/sp/", // 認証後に戻りたい場所
      privateKey: spKeys().privateKey,
    });
    return c.redirect(url);
  });
}
