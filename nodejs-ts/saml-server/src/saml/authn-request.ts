/**
 * AuthnRequest = SP が IdP に出す「このユーザーを認証して」という要求。
 * 中身は軽く、ID(後で Response の InResponseTo と突合する)・Issuer(SP の entityId)・
 * どこに応答を返してほしいか(AssertionConsumerServiceURL)などを含む。
 */
import { genId, instant } from "./ids";
import { NS, escapeXml, parseXml, attr, text, selectOne } from "./xml";
import type { ParsedAuthnRequest } from "./types";

export interface BuildAuthnRequestOptions {
  issuer: string; // SP entityId
  destination: string; // IdP の SSO エンドポイント
  acsUrl: string; // 応答を受け取る SP の ACS URL
  id?: string;
}

export function buildAuthnRequest(o: BuildAuthnRequestOptions): { id: string; xml: string } {
  const id = o.id ?? genId();
  const xml =
    `<samlp:AuthnRequest xmlns:samlp="${NS.samlp}" xmlns:saml="${NS.saml}"` +
    ` ID="${id}" Version="2.0" IssueInstant="${instant()}"` +
    ` Destination="${escapeXml(o.destination)}"` +
    ` ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"` +
    ` AssertionConsumerServiceURL="${escapeXml(o.acsUrl)}">` +
    `<saml:Issuer>${escapeXml(o.issuer)}</saml:Issuer>` +
    `<samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>` +
    `</samlp:AuthnRequest>`;
  return { id, xml };
}

export function parseAuthnRequest(xml: string): ParsedAuthnRequest {
  const doc = parseXml(xml);
  const root = selectOne("/*[local-name(.)='AuthnRequest']", doc);
  if (!root) throw new Error("AuthnRequest ではない XML");
  return {
    id: attr(root, "ID") ?? "",
    issueInstant: attr(root, "IssueInstant") ?? "",
    destination: attr(root, "Destination"),
    acsUrl: attr(root, "AssertionConsumerServiceURL"),
    issuer: text("//*[local-name(.)='Issuer']", doc) ?? "",
  };
}
