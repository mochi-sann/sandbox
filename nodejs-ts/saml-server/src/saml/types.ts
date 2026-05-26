/**
 * SAML コア全体で使う型。
 * "Parsed*" は受信した XML を読み取って取り出した値の構造体を表す。
 */

/** 認証済みユーザー。IdP がこの情報を Assertion に詰めて SP に渡す。 */
export interface SamlUser {
  username: string;
  /** Subject の NameID に入れる識別子 (ここでは email を使う)。 */
  nameId: string;
  /** AttributeStatement に入れる追加属性 (displayName, role など)。 */
  attributes: Record<string, string>;
}

/** SP → IdP の認証要求 (AuthnRequest)。 */
export interface ParsedAuthnRequest {
  id: string;
  issuer: string; // 要求元 SP の entityId
  issueInstant: string;
  destination?: string;
  /** 応答(Assertion)を返してほしい SP の ACS URL。 */
  acsUrl?: string;
}

/** Assertion (IdP が発行する「この人は認証済み」という署名付きの主張)。 */
export interface ParsedAssertion {
  id: string;
  issuer: string;
  nameId: string;
  /** この Assertion が向けられた相手 (= SP entityId)。 */
  audience?: string;
  notBefore?: string;
  notOnOrAfter?: string;
  sessionIndex?: string;
  attributes: Record<string, string>;
}

/** IdP → SP の認証応答 (Response)。中に Assertion を含む。 */
export interface ParsedResponse {
  id: string;
  inResponseTo?: string; // 対応する AuthnRequest の ID
  issuer: string;
  statusCode: string;
  assertion?: ParsedAssertion;
}

/** SLO のログアウト要求。 */
export interface ParsedLogoutRequest {
  id: string;
  issuer: string;
  nameId: string;
  sessionIndex?: string;
  destination?: string;
}

/** SLO のログアウト応答。 */
export interface ParsedLogoutResponse {
  id: string;
  inResponseTo?: string;
  issuer: string;
  statusCode: string;
}

/** SAML の Status コード (一部)。 */
export const StatusCode = {
  Success: "urn:oasis:names:tc:SAML:2.0:status:Success",
  Requester: "urn:oasis:names:tc:SAML:2.0:status:Requester",
  Responder: "urn:oasis:names:tc:SAML:2.0:status:Responder",
} as const;
