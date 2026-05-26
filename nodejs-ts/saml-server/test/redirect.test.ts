import { describe, it, expect } from "vitest";
import { buildRedirectUrl, parseRedirect } from "../src/saml/redirect-binding";
import { makeKeyPair } from "./helpers";

const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_req1">こんにちは &amp; ようこそ</samlp:AuthnRequest>`;

describe("HTTP-Redirect binding", () => {
  const sp = makeKeyPair("sp");

  it("deflate+base64 の往復で元の XML に戻る", () => {
    const url = buildRedirectUrl({
      endpoint: "http://idp.example/sso",
      xml,
      param: "SAMLRequest",
      relayState: "/dashboard",
    });
    const query = url.split("?")[1]!;
    const r = parseRedirect(query);
    expect(r.xml).toBe(xml);
    expect(r.relayState).toBe("/dashboard");
  });

  it("クエリ署名が正しく検証される", () => {
    const url = buildRedirectUrl({
      endpoint: "http://idp.example/sso",
      xml,
      param: "SAMLRequest",
      relayState: "state-123",
      privateKey: sp.privateKey,
    });
    const query = url.split("?")[1]!;
    const r = parseRedirect(query, sp.certificate);
    expect(r.signatureValid).toBe(true);
    expect(r.xml).toBe(xml);
  });

  it("クエリを改ざんすると署名検証が失敗する", () => {
    const url = buildRedirectUrl({
      endpoint: "http://idp.example/sso",
      xml,
      param: "SAMLRequest",
      relayState: "state-123",
      privateKey: sp.privateKey,
    });
    // RelayState を書き換える(署名対象なので検証は失敗するはず)
    const query = url.split("?")[1]!.replace("state-123", "tampered");
    const r = parseRedirect(query, sp.certificate);
    expect(r.signatureValid).toBe(false);
  });
});
