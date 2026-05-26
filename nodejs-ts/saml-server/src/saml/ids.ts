/**
 * SAML メッセージの ID と時刻の生成。
 *
 * - ID: SAML の ID 属性は xsd:ID 型で「数字始まり禁止」。慣習として "_" + ランダム hex を使う。
 *   この ID は AuthnRequest と Response の InResponseTo の突合や、署名の Reference URI に使われる。
 * - 時刻: SAML の dateTime は UTC・ミリ秒なしの ISO8601 ("2026-05-26T12:00:00Z") が無難。
 */
import { randomBytes } from "node:crypto";

/** "_" + 20バイトの乱数(hex) からなる SAML ID を生成。 */
export function genId(): string {
  return "_" + randomBytes(20).toString("hex");
}

/** 現在時刻 (またはオフセット秒後) を SAML dateTime 文字列で返す。 */
export function instant(offsetSeconds = 0): string {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
