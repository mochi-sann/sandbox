import { describe, it, expect } from "vitest";
import { signXml, verifyXmlSignature } from "../src/saml/sign-xml";
import { makeKeyPair } from "./helpers";

const ASSERTION_XPATH = "//*[local-name(.)='Assertion']";

function sampleAssertion(): string {
  return (
    `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_a1" Version="2.0" IssueInstant="2026-05-26T00:00:00Z">` +
    `<saml:Issuer>http://idp.example/metadata</saml:Issuer>` +
    `<saml:Subject><saml:NameID>alice@example.com</saml:NameID></saml:Subject>` +
    `</saml:Assertion>`
  );
}

describe("XML-DSig (sign-xml)", () => {
  const idp = makeKeyPair("idp");

  const signed = signXml(sampleAssertion(), {
    privateKey: idp.privateKey,
    certificate: idp.certificate,
    targetXPath: ASSERTION_XPATH,
    insertAfterXPath: `${ASSERTION_XPATH}/*[local-name(.)='Issuer']`,
  });

  it("署名→検証が成功し、署名された範囲を取り出せる", () => {
    const r = verifyXmlSignature(signed, idp.certificate);
    expect(r.valid).toBe(true);
    expect(r.signedXml).toContain("Assertion");
    expect(r.signedXml).toContain("alice@example.com");
  });

  it("署名が Issuer の直後に挿入される", () => {
    expect(signed).toMatch(/<\/saml:Issuer>\s*<(ds:)?Signature/);
  });

  it("本文を改ざんすると検証に失敗する", () => {
    const tampered = signed.replace("alice@example.com", "attacker@evil.com");
    const r = verifyXmlSignature(tampered, idp.certificate);
    expect(r.valid).toBe(false);
  });

  it("別人の証明書では検証に失敗する(KeyInfo を信用せずピン留めしている)", () => {
    const attacker = makeKeyPair("attacker");
    // 攻撃者が自分の鍵で署名し直しても…
    const evil = signXml(sampleAssertion().replace("alice", "attacker"), {
      privateKey: attacker.privateKey,
      certificate: attacker.certificate,
      targetXPath: ASSERTION_XPATH,
      insertAfterXPath: `${ASSERTION_XPATH}/*[local-name(.)='Issuer']`,
    });
    // IdP の証明書で検証すれば拒否される。
    const r = verifyXmlSignature(evil, idp.certificate);
    expect(r.valid).toBe(false);
  });
});
