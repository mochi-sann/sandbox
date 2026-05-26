/**
 * SSO エンドポイント。SP からの AuthnRequest を受け取る。
 *   GET  /idp/sso : HTTP-Redirect バインディング (クエリ署名を検証)
 *   POST /idp/sso : HTTP-POST バインディング (XML-DSig があれば検証)
 * 既にログイン済みなら即 Response を発行、未ログインならログイン画面へ誘導する。
 */
import type { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import { parseRedirect } from "../../saml/redirect-binding";
import { decodePost } from "../../saml/post-binding";
import { parseAuthnRequest } from "../../saml/authn-request";
import { hasSignature, verifyXmlSignature } from "../../saml/sign-xml";
import { spCertificate } from "../../config";
import { idpStore, type PendingSso } from "../store";
import { issueResponseForm } from "../issue";

function handleAuthn(c: Context, authnXml: string, relayState?: string): Response {
  const req = parseAuthnRequest(authnXml);
  if (!req.acsUrl) return c.text("AuthnRequest に AssertionConsumerServiceURL が無い", 400);

  const pending: PendingSso = {
    spEntityId: req.issuer,
    acsUrl: req.acsUrl,
    inResponseTo: req.id,
    relayState,
  };

  // 既にログイン済み(IdP セッション cookie あり)なら、再ログイン無しで Response を発行。
  const session = idpStore.getSession(getCookie(c, "idp_sid"));
  if (session) {
    return c.html(issueResponseForm(session.user, pending, session.sessionIndex));
  }

  // 未ログイン: 要求コンテキストを保存し、ログイン画面へ。
  const rid = idpStore.putPending(pending);
  return c.redirect(`/idp/login?rid=${rid}`);
}

export function registerSso(app: Hono): void {
  // HTTP-Redirect バインディング
  app.get("/idp/sso", (c) => {
    const rawQuery = new URL(c.req.url).search.slice(1);
    const { xml, relayState, signatureValid } = parseRedirect(rawQuery, spCertificate());
    if (signatureValid === false) {
      return c.text("AuthnRequest のクエリ署名検証に失敗しました", 400);
    }
    return handleAuthn(c, xml, relayState);
  });

  // HTTP-POST バインディング
  app.post("/idp/sso", async (c) => {
    const body = await c.req.parseBody();
    const xml = decodePost(String(body["SAMLRequest"] ?? ""));
    const relayState = body["RelayState"] ? String(body["RelayState"]) : undefined;

    // POST の AuthnRequest は XML-DSig 署名されていることがある。あれば検証する。
    if (hasSignature(xml)) {
      const v = verifyXmlSignature(xml, spCertificate());
      if (!v.valid) return c.text("AuthnRequest の署名検証に失敗しました", 400);
    }
    return handleAuthn(c, xml, relayState);
  });
}
