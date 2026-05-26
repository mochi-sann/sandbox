/**
 * Assertion Consumer Service (ACS)。
 * IdP からの SAML Response を HTTP-POST バインディングで受け取り、検証する。
 * 検証順:
 *   1. InResponseTo が「自分が送った要求」か (未要請レスポンス対策)。IdP-initiated なら省略。
 *   2. validateResponse: 署名・Status・宛先・有効期限・対応付け(sign-xml/response を参照)。
 * 成功したら SP セッションを確立して保護ページへ。
 */
import type { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { decodePost } from "../../saml/post-binding";
import { parseResponse, validateResponse } from "../../saml/response";
import { escapeXml } from "../../saml/xml";
import { idpCertificate, sp } from "../../config";
import { spStore } from "../store";

export function registerAcs(app: Hono): void {
  app.post("/sp/acs", async (c) => {
    const body = await c.req.parseBody();
    const xml = decodePost(String(body["SAMLResponse"] ?? ""));
    const relayState = body["RelayState"] ? String(body["RelayState"]) : undefined;

    // 1) InResponseTo が自分の送った要求かを確認 (本当の未要請レスポンス対策はここ)。
    const peek = parseResponse(xml);
    let expectedInResponseTo: string | undefined;
    if (peek.inResponseTo) {
      if (!spStore.consumeRequest(peek.inResponseTo)) {
        return c.text("身に覚えのない InResponseTo です(この SP が送っていない要求)", 400);
      }
      expectedInResponseTo = peek.inResponseTo;
    }
    // peek.inResponseTo が無い場合は IdP-initiated とみなす。

    // 2) 署名・宛先・有効期限などの検証。
    const result = validateResponse({
      xml,
      idpCertificate: idpCertificate(),
      expectedAudience: sp.entityId,
      expectedInResponseTo,
    });

    if (!result.ok || !result.assertion) {
      const list = result.errors.map((e) => `<li>${escapeXml(e)}</li>`).join("");
      return c.html(
        `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif">` +
          `<h1>SAML 応答の検証に失敗</h1><ul>${list}</ul>` +
          `<p><a href="/sp/login">やり直す</a></p></body>`,
        401,
      );
    }

    // SP セッションを確立。
    const a = result.assertion;
    const sid = spStore.createSession({
      nameId: a.nameId,
      attributes: a.attributes,
      sessionIndex: a.sessionIndex,
    });
    setCookie(c, "sp_sid", sid, { httpOnly: true, path: "/", sameSite: "Lax" });

    return c.redirect(relayState && relayState.startsWith("/") ? relayState : "/sp/");
  });
}
