/**
 * 認証済みユーザーに対して SAML Response を発行し、SP の ACS へ自動 POST する
 * HTML を返す共通処理。SP-initiated / IdP-initiated の両方から使う。
 */
import { buildAssertion } from "../saml/assertion";
import { buildResponse } from "../saml/response";
import { autoPostForm, encodePost } from "../saml/post-binding";
import { idp as idpCfg, idpKeys } from "../config";
import type { SamlUser } from "../saml/types";
import type { PendingSso } from "./store";

export function issueResponseForm(
  user: SamlUser,
  pending: PendingSso,
  sessionIndex: string,
): string {
  const { xml: assertionXml } = buildAssertion({
    issuer: idpCfg.entityId,
    user,
    audience: pending.spEntityId,
    recipient: pending.acsUrl,
    sessionIndex,
    inResponseTo: pending.inResponseTo,
  });

  const { xml } = buildResponse({
    idpEntityId: idpCfg.entityId,
    destination: pending.acsUrl,
    assertionXml,
    privateKey: idpKeys().privateKey,
    certificate: idpKeys().certificate,
    inResponseTo: pending.inResponseTo,
  });

  const fields: Record<string, string> = { SAMLResponse: encodePost(xml) };
  if (pending.relayState) fields.RelayState = pending.relayState;

  return autoPostForm(pending.acsUrl, fields, "認証に成功しました。サービスへ戻ります…");
}
