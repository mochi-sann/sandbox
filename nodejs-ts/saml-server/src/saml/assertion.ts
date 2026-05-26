/**
 * Assertion = IdP が発行する「この人は認証済みで、属性はこれ」という主張。
 * SAML の本体であり、署名されるのは通常この Assertion。中身の重要要素:
 *   - Subject/NameID         : 誰か
 *   - SubjectConfirmationData: 誰宛て(Recipient)・いつまで・どの要求への応答(InResponseTo)
 *   - Conditions             : 有効期間(NotBefore/NotOnOrAfter)と宛先(AudienceRestriction)
 *   - AuthnStatement         : いつ・どうやって認証したか(+SessionIndex: SLO で使う)
 *   - AttributeStatement     : 追加属性
 */
import { genId, instant } from "./ids";
import { NS, escapeXml, parseXml, attr, text, selectOne, selectAll } from "./xml";
import type { ParsedAssertion, SamlUser } from "./types";

const NAMEID_EMAIL = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";

export interface BuildAssertionOptions {
  issuer: string; // IdP entityId
  user: SamlUser;
  audience: string; // 宛先 SP entityId
  recipient: string; // SP の ACS URL
  sessionIndex: string;
  inResponseTo?: string; // SP-initiated のとき対応する AuthnRequest ID
  validitySeconds?: number; // 既定 300 秒
  id?: string;
}

export function buildAssertion(o: BuildAssertionOptions): { id: string; xml: string } {
  const id = o.id ?? genId();
  const now = instant();
  const expiry = instant(o.validitySeconds ?? 300);

  const attributes = Object.entries(o.user.attributes)
    .map(
      ([name, value]) =>
        `<saml:Attribute Name="${escapeXml(name)}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">` +
        `<saml:AttributeValue>${escapeXml(value)}</saml:AttributeValue></saml:Attribute>`,
    )
    .join("");

  const inResponseTo = o.inResponseTo
    ? ` InResponseTo="${escapeXml(o.inResponseTo)}"`
    : "";

  const xml =
    `<saml:Assertion xmlns:saml="${NS.saml}" ID="${id}" Version="2.0" IssueInstant="${now}">` +
    `<saml:Issuer>${escapeXml(o.issuer)}</saml:Issuer>` +
    `<saml:Subject>` +
    `<saml:NameID Format="${NAMEID_EMAIL}">${escapeXml(o.user.nameId)}</saml:NameID>` +
    `<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">` +
    `<saml:SubjectConfirmationData${inResponseTo} NotOnOrAfter="${expiry}" Recipient="${escapeXml(o.recipient)}"/>` +
    `</saml:SubjectConfirmation></saml:Subject>` +
    `<saml:Conditions NotBefore="${now}" NotOnOrAfter="${expiry}">` +
    `<saml:AudienceRestriction><saml:Audience>${escapeXml(o.audience)}</saml:Audience></saml:AudienceRestriction>` +
    `</saml:Conditions>` +
    `<saml:AuthnStatement AuthnInstant="${now}" SessionIndex="${escapeXml(o.sessionIndex)}">` +
    `<saml:AuthnContext><saml:AuthnContextClassRef>` +
    `urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport` +
    `</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>` +
    `<saml:AttributeStatement>${attributes}</saml:AttributeStatement>` +
    `</saml:Assertion>`;

  return { id, xml };
}

/** Assertion(単体 XML、または Assertion を含む XML)を読み取る。 */
export function parseAssertion(xml: string): ParsedAssertion {
  const doc = parseXml(xml);
  const root = selectOne("//*[local-name(.)='Assertion']", doc);
  if (!root) throw new Error("Assertion が見つからない");

  const attributes: Record<string, string> = {};
  for (const a of selectAll("//*[local-name(.)='Attribute']", root)) {
    const name = attr(a, "Name");
    const value = text("./*[local-name(.)='AttributeValue']", a);
    if (name) attributes[name] = value ?? "";
  }

  return {
    id: attr(root, "ID") ?? "",
    issuer: text("./*[local-name(.)='Issuer']", root) ?? "",
    nameId: text(".//*[local-name(.)='NameID']", root) ?? "",
    audience: text(".//*[local-name(.)='Audience']", root),
    notBefore: attr(selectOne(".//*[local-name(.)='Conditions']", root), "NotBefore"),
    notOnOrAfter: attr(selectOne(".//*[local-name(.)='Conditions']", root), "NotOnOrAfter"),
    sessionIndex: attr(selectOne(".//*[local-name(.)='AuthnStatement']", root), "SessionIndex"),
    attributes,
  };
}
