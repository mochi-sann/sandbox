/**
 * HTTP-POST バインディング。
 *
 * SAML メッセージを base64 にして HTML フォームの hidden フィールドに載せ、
 * ブラウザの自動 submit で相手の POST エンドポイントへ送る方式。
 * Redirect と違い DEFLATE はしない(POST body はサイズ制限が緩いため)。
 * 署名は通常 XML-DSig をメッセージ内部に埋め込む(sign-xml.ts を参照)。
 */
import { escapeXml } from "./xml";

/** XML → base64 (POST フィールド用)。 */
export function encodePost(xml: string): string {
  return Buffer.from(xml, "utf8").toString("base64");
}

/** base64 → XML。 */
export function decodePost(field: string): string {
  return Buffer.from(field, "base64").toString("utf8");
}

/**
 * ブラウザを相手のエンドポイントへ自動 POST させる HTML を生成する。
 * JS 無効でも送信できるよう、手動送信ボタンも置いておく。
 */
export function autoPostForm(
  actionUrl: string,
  fields: Record<string, string>,
  heading = "SAML POST 送信中…",
): string {
  const inputs = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeXml(name)}" value="${escapeXml(value)}" />`,
    )
    .join("\n      ");

  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8" /><title>${escapeXml(heading)}</title></head>
<body onload="document.forms[0].submit()">
  <p>${escapeXml(heading)}</p>
  <form method="POST" action="${escapeXml(actionUrl)}">
      ${inputs}
      <noscript><button type="submit">続行</button></noscript>
  </form>
</body>
</html>`;
}
