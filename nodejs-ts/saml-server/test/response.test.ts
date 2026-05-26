import { describe, it, expect } from "vitest";
import { buildAssertion } from "../src/saml/assertion";
import { buildResponse, validateResponse } from "../src/saml/response";
import { makeKeyPair } from "./helpers";

const IDP = "http://idp.example/metadata";
const SP = "http://sp.example/metadata";
const ACS = "http://sp.example/acs";

const idp = makeKeyPair("idp");

interface MakeOpts {
  audience?: string;
  inResponseTo?: string;
  validitySeconds?: number;
}

function makeResponseXml(o: MakeOpts = {}): string {
  const { xml: assertionXml } = buildAssertion({
    issuer: IDP,
    user: {
      username: "alice",
      nameId: "alice@example.com",
      attributes: { role: "admin", displayName: "Alice" },
    },
    audience: o.audience ?? SP,
    recipient: ACS,
    sessionIndex: "sess-1",
    inResponseTo: o.inResponseTo,
    validitySeconds: o.validitySeconds ?? 300,
  });
  return buildResponse({
    idpEntityId: IDP,
    destination: ACS,
    assertionXml,
    privateKey: idp.privateKey,
    certificate: idp.certificate,
    inResponseTo: o.inResponseTo,
  }).xml;
}

describe("validateResponse — 署名と XSW (実装済み)", () => {
  it("正当な Response は検証を通過し、属性が取り出せる", () => {
    const xml = makeResponseXml({ inResponseTo: "_req1" });
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      expectedInResponseTo: "_req1",
    });
    expect(r.ok).toBe(true);
    expect(r.assertion?.nameId).toBe("alice@example.com");
    expect(r.assertion?.attributes.role).toBe("admin");
  });

  it("署名対象を改ざんした Response は拒否される", () => {
    const xml = makeResponseXml({ inResponseTo: "_req1" }).replace(
      "alice@example.com",
      "attacker@evil.com",
    );
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      expectedInResponseTo: "_req1",
    });
    expect(r.ok).toBe(false);
  });

  it("XSW: 署名外に注入された Assertion は採用されない", () => {
    const evil =
      `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_evil">` +
      `<saml:Issuer>${IDP}</saml:Issuer>` +
      `<saml:Subject><saml:NameID>attacker@evil.com</saml:NameID></saml:Subject>` +
      `<saml:AttributeStatement><saml:Attribute Name="role">` +
      `<saml:AttributeValue>superadmin</saml:AttributeValue></saml:Attribute></saml:AttributeStatement>` +
      `</saml:Assertion>`;
    const xml = makeResponseXml({ inResponseTo: "_req1" }).replace(
      "</samlp:Status>",
      `</samlp:Status>${evil}`,
    );
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      expectedInResponseTo: "_req1",
    });
    // 攻撃者の値が採用されてはならない(拒否される or 署名された alice が採用される)。
    expect(r.assertion?.nameId).not.toBe("attacker@evil.com");
  });
});

// ───────────────────────────────────────────────────────────────
// 以下は response.ts の validateResponse 内 TODO(human) を実装すると通る。
// (実装前は「拒否されるはず」のケースが ok:true のままで失敗する)
// ───────────────────────────────────────────────────────────────
describe("validateResponse — 論理検証 (TODO(human) 実装後に通る)", () => {
  it("Audience が異なる Response は拒否される", () => {
    const xml = makeResponseXml({
      audience: "http://other-sp.example/metadata",
      inResponseTo: "_req1",
    });
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      expectedInResponseTo: "_req1",
    });
    expect(r.ok).toBe(false);
  });

  it("有効期限切れの Response は拒否される", () => {
    const xml = makeResponseXml({ validitySeconds: -10, inResponseTo: "_req1" });
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      expectedInResponseTo: "_req1",
    });
    expect(r.ok).toBe(false);
  });

  it("InResponseTo が一致しない Response は拒否される", () => {
    const xml = makeResponseXml({ inResponseTo: "_req1" });
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      expectedInResponseTo: "_DIFFERENT",
    });
    expect(r.ok).toBe(false);
  });

  it("IdP-initiated (expectedInResponseTo 未指定) では InResponseTo を要求しない", () => {
    const xml = makeResponseXml(); // inResponseTo 無し
    const r = validateResponse({
      xml,
      idpCertificate: idp.certificate,
      expectedAudience: SP,
      // expectedInResponseTo を渡さない
    });
    expect(r.ok).toBe(true);
  });
});
