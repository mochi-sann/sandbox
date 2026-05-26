/**
 * メタデータ = IdP / SP が互いを信頼するための「自己紹介カード」。
 * entityId・署名用の証明書・各エンドポイント(SSO/ACS/SLO)とそのバインディングを記載する。
 * 相手のメタデータを読み込むことで「誰の署名を信じ、どこへ送るか」が確定する(信頼の確立)。
 */
import {
  NS,
  escapeXml,
  certToBase64,
  base64ToCert,
  parseXml,
  attr,
  text,
  selectOne,
  selectAll,
} from "./xml";

const B = {
  redirect: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
  post: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
} as const;
const NAMEID_EMAIL = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";

export interface IdpMetadataOptions {
  entityId: string;
  certificate: string; // PEM
  ssoUrl: string;
  sloUrl: string;
}

export function buildIdpMetadata(o: IdpMetadataOptions): string {
  const cert = certToBase64(o.certificate);
  return (
    `<md:EntityDescriptor xmlns:md="${NS.md}" xmlns:ds="${NS.ds}" entityID="${escapeXml(o.entityId)}">` +
    `<md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="${NS.samlp}">` +
    `<md:KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data>` +
    `<ds:X509Certificate>${cert}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>` +
    `<md:SingleLogoutService Binding="${B.redirect}" Location="${escapeXml(o.sloUrl)}"/>` +
    `<md:NameIDFormat>${NAMEID_EMAIL}</md:NameIDFormat>` +
    `<md:SingleSignOnService Binding="${B.redirect}" Location="${escapeXml(o.ssoUrl)}"/>` +
    `<md:SingleSignOnService Binding="${B.post}" Location="${escapeXml(o.ssoUrl)}"/>` +
    `</md:IDPSSODescriptor></md:EntityDescriptor>`
  );
}

export interface SpMetadataOptions {
  entityId: string;
  certificate: string; // PEM
  acsUrl: string;
  sloUrl: string;
}

export function buildSpMetadata(o: SpMetadataOptions): string {
  const cert = certToBase64(o.certificate);
  return (
    `<md:EntityDescriptor xmlns:md="${NS.md}" xmlns:ds="${NS.ds}" entityID="${escapeXml(o.entityId)}">` +
    `<md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true" protocolSupportEnumeration="${NS.samlp}">` +
    `<md:KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data>` +
    `<ds:X509Certificate>${cert}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>` +
    `<md:SingleLogoutService Binding="${B.redirect}" Location="${escapeXml(o.sloUrl)}"/>` +
    `<md:NameIDFormat>${NAMEID_EMAIL}</md:NameIDFormat>` +
    `<md:AssertionConsumerService Binding="${B.post}" Location="${escapeXml(o.acsUrl)}" index="0" isDefault="true"/>` +
    `</md:SPSSODescriptor></md:EntityDescriptor>`
  );
}

export interface ParsedMetadata {
  entityId: string;
  certificate?: string; // PEM に復元済み
  ssoRedirectUrl?: string;
  ssoPostUrl?: string;
  acsUrl?: string;
  sloUrl?: string;
}

/** メタデータ XML から証明書・エンドポイントを読み取る。 */
export function parseMetadata(xml: string): ParsedMetadata {
  const doc = parseXml(xml);
  const root = selectOne("//*[local-name(.)='EntityDescriptor']", doc);
  if (!root) throw new Error("EntityDescriptor が見つからない");

  const certB64 = text("//*[local-name(.)='X509Certificate']", root);

  const endpoint = (local: string, binding: string): string | undefined => {
    for (const n of selectAll(`//*[local-name(.)='${local}']`, root)) {
      if (attr(n, "Binding") === binding) return attr(n, "Location");
    }
    return undefined;
  };

  return {
    entityId: attr(root, "entityID") ?? "",
    certificate: certB64 ? base64ToCert(certB64) : undefined,
    ssoRedirectUrl: endpoint("SingleSignOnService", B.redirect),
    ssoPostUrl: endpoint("SingleSignOnService", B.post),
    acsUrl: endpoint("AssertionConsumerService", B.post),
    sloUrl: endpoint("SingleLogoutService", B.redirect),
  };
}
