/**
 * Response = IdP が SP に返す認証応答。中に署名付き Assertion を1つ含む。
 *
 * - buildResponse   : Response を組み立て、内部の Assertion に XML-DSig 署名を付ける(IdP 側)。
 * - parseResponse   : Response を読み取る。
 * - validateResponse: 受け取った Response を「信頼してよいか」検証する(SP 側)。SAML の安全性の心臓部。
 */
import { genId, instant } from "./ids";
import { NS, escapeXml, parseXml, attr, text, selectOne } from "./xml";
import { signXml, verifyXmlSignature } from "./sign-xml";
import { parseAssertion } from "./assertion";
import { StatusCode } from "./types";
import type { ParsedAssertion, ParsedResponse } from "./types";

export interface BuildResponseOptions {
  idpEntityId: string;
  destination: string; // SP の ACS URL
  assertionXml: string; // buildAssertion() の出力
  privateKey: string; // IdP の秘密鍵
  certificate: string; // IdP の証明書(KeyInfo に埋め込む)
  inResponseTo?: string;
  status?: string;
  id?: string;
}

/** Response を組み立て、内部の Assertion を署名して返す。 */
export function buildResponse(o: BuildResponseOptions): { id: string; xml: string } {
  const id = o.id ?? genId();
  const status = o.status ?? StatusCode.Success;
  const inResponseTo = o.inResponseTo ? ` InResponseTo="${escapeXml(o.inResponseTo)}"` : "";

  const xml =
    `<samlp:Response xmlns:samlp="${NS.samlp}" xmlns:saml="${NS.saml}"` +
    ` ID="${id}" Version="2.0" IssueInstant="${instant()}"` +
    ` Destination="${escapeXml(o.destination)}"${inResponseTo}>` +
    `<saml:Issuer>${escapeXml(o.idpEntityId)}</saml:Issuer>` +
    `<samlp:Status><samlp:StatusCode Value="${escapeXml(status)}"/></samlp:Status>` +
    o.assertionXml +
    `</samlp:Response>`;

  // Assertion 要素を署名対象にし、Assertion の Issuer の直後に <ds:Signature> を挿入する
  // (SAML スキーマは Issuer の直後に Signature を置くことを要求する)。
  return {
    id,
    xml: signXml(xml, {
      privateKey: o.privateKey,
      certificate: o.certificate,
      targetXPath: "//*[local-name(.)='Assertion']",
      insertAfterXPath: "//*[local-name(.)='Assertion']/*[local-name(.)='Issuer']",
    }),
  };
}

export function parseResponse(xml: string): ParsedResponse {
  const doc = parseXml(xml);
  const root = selectOne("/*[local-name(.)='Response']", doc);
  if (!root) throw new Error("Response ではない XML");

  const hasAssertion = selectOne("//*[local-name(.)='Assertion']", root);
  return {
    id: attr(root, "ID") ?? "",
    inResponseTo: attr(root, "InResponseTo"),
    issuer: text("./*[local-name(.)='Issuer']", root) ?? "",
    statusCode: attr(selectOne(".//*[local-name(.)='StatusCode']", root), "Value") ?? "",
    assertion: hasAssertion ? parseAssertion(xml) : undefined,
  };
}

export interface ValidateResponseOptions {
  xml: string;
  /** 署名検証に使う IdP の証明書 (PEM)。 */
  idpCertificate: string;
  /** 我々(SP)の entityId。Assertion の Audience がこれと一致すべき。 */
  expectedAudience: string;
  /** 我々が送った AuthnRequest の ID。IdP-initiated なら undefined。 */
  expectedInResponseTo?: string;
  /** 時刻検証の基準(テスト用に注入可能)。 */
  now?: Date;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  assertion?: ParsedAssertion;
  statusCode?: string;
}

/**
 * 受け取った Response を検証する。検証順:
 *   1. Status が Success か
 *   2. 署名が IdP の証明書で正しく検証できるか
 *   3. (XSW 対策) 消費する Assertion は「署名された範囲」から取り出す
 *   4. Assertion の論理検証 (宛先・有効期限・対応する要求への応答か)  ← あなたが実装
 */
export function validateResponse(o: ValidateResponseOptions): ValidationResult {
  const errors: string[] = [];
  const now = o.now ?? new Date();

  // 1) Status
  const parsed = parseResponse(o.xml);
  if (parsed.statusCode !== StatusCode.Success) {
    errors.push(`Status が Success ではない: ${parsed.statusCode || "(なし)"}`);
  }

  // 2) 署名検証
  const verify = verifyXmlSignature(o.xml, o.idpCertificate);
  if (!verify.valid || !verify.signedXml) {
    errors.push(`署名が無効: ${verify.error ?? "検証失敗"}`);
    return { ok: false, errors, statusCode: parsed.statusCode };
  }

  // 3) XSW 対策: 元 XML ではなく「署名された範囲(verify.signedXml)」から Assertion を取り出す。
  //    こうすることで、攻撃者が別の未署名 Assertion を注入しても掴まされない。
  const assertion = parseAssertion(verify.signedXml);

  // 4) 論理検証 ───────────────────────────────────────────────
  // TODO(human): この Assertion を信頼してよいか、次の3点を検証して
  //   問題があれば errors.push("...") でエラーを積む。
  //
  //   (a) 宛先(Audience): assertion.audience が o.expectedAudience と一致するか。
  //       → 他の SP 宛に発行された Assertion を使い回す攻撃を防ぐ。
  //   (b) 有効期間: now が [assertion.notBefore, assertion.notOnOrAfter) の範囲内か。
  //       → 文字列は ISO8601 (例 "2026-05-26T12:00:00Z")。new Date(str).getTime() で比較できる。
  //       → 期限切れ・未来開始の Assertion を拒否する。
  //   (c) 応答の対応付け: o.expectedInResponseTo が指定されている場合のみ、
  //       parsed.inResponseTo と一致するか。
  //       → 自分が送った AuthnRequest への応答であることを確認(リプレイ/差し替え対策)。
  //       ※ IdP-initiated (expectedInResponseTo が undefined) のときはこのチェックをスキップ。
  //
  // 利用できる変数: assertion(ParsedAssertion), parsed(ParsedResponse), now(Date), o(オプション)

  return { ok: errors.length === 0, errors, assertion, statusCode: parsed.statusCode };
}
