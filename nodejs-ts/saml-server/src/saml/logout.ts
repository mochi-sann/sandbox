/**
 * Single Logout (SLO)。
 * LogoutRequest  : 「このセッション(NameID + SessionIndex)を終了して」という要求。
 * LogoutResponse : それに対する応答(Status を含む)。
 * SP から始めても IdP から始めてもよい。本実装は Redirect バインディングで送る。
 */
import { genId, instant } from "./ids";
import { NS, escapeXml, parseXml, attr, text, selectOne } from "./xml";
import { StatusCode } from "./types";
import type { ParsedLogoutRequest, ParsedLogoutResponse } from "./types";

export interface BuildLogoutRequestOptions {
  issuer: string; // 送信元 entityId
  destination: string; // 相手の SLO エンドポイント
  nameId: string;
  sessionIndex?: string;
  id?: string;
}

export function buildLogoutRequest(o: BuildLogoutRequestOptions): { id: string; xml: string } {
  const id = o.id ?? genId();
  const sessionIndex = o.sessionIndex
    ? `<samlp:SessionIndex>${escapeXml(o.sessionIndex)}</samlp:SessionIndex>`
    : "";
  const xml =
    `<samlp:LogoutRequest xmlns:samlp="${NS.samlp}" xmlns:saml="${NS.saml}"` +
    ` ID="${id}" Version="2.0" IssueInstant="${instant()}" Destination="${escapeXml(o.destination)}">` +
    `<saml:Issuer>${escapeXml(o.issuer)}</saml:Issuer>` +
    `<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${escapeXml(o.nameId)}</saml:NameID>` +
    sessionIndex +
    `</samlp:LogoutRequest>`;
  return { id, xml };
}

export function parseLogoutRequest(xml: string): ParsedLogoutRequest {
  const doc = parseXml(xml);
  const root = selectOne("/*[local-name(.)='LogoutRequest']", doc);
  if (!root) throw new Error("LogoutRequest ではない");
  return {
    id: attr(root, "ID") ?? "",
    destination: attr(root, "Destination"),
    issuer: text(".//*[local-name(.)='Issuer']", root) ?? "",
    nameId: text(".//*[local-name(.)='NameID']", root) ?? "",
    sessionIndex: text(".//*[local-name(.)='SessionIndex']", root),
  };
}

export interface BuildLogoutResponseOptions {
  issuer: string;
  destination: string;
  inResponseTo: string;
  status?: string;
  id?: string;
}

export function buildLogoutResponse(o: BuildLogoutResponseOptions): { id: string; xml: string } {
  const id = o.id ?? genId();
  const status = o.status ?? StatusCode.Success;
  const xml =
    `<samlp:LogoutResponse xmlns:samlp="${NS.samlp}" xmlns:saml="${NS.saml}"` +
    ` ID="${id}" Version="2.0" IssueInstant="${instant()}"` +
    ` Destination="${escapeXml(o.destination)}" InResponseTo="${escapeXml(o.inResponseTo)}">` +
    `<saml:Issuer>${escapeXml(o.issuer)}</saml:Issuer>` +
    `<samlp:Status><samlp:StatusCode Value="${escapeXml(status)}"/></samlp:Status>` +
    `</samlp:LogoutResponse>`;
  return { id, xml };
}

export function parseLogoutResponse(xml: string): ParsedLogoutResponse {
  const doc = parseXml(xml);
  const root = selectOne("/*[local-name(.)='LogoutResponse']", doc);
  if (!root) throw new Error("LogoutResponse ではない");
  return {
    id: attr(root, "ID") ?? "",
    inResponseTo: attr(root, "InResponseTo"),
    issuer: text(".//*[local-name(.)='Issuer']", root) ?? "",
    statusCode: attr(selectOne(".//*[local-name(.)='StatusCode']", root), "Value") ?? "",
  };
}
