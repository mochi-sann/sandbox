/**
 * XML のパース・検索・組み立てに使う薄いヘルパ群。
 *
 * SAML の XML は名前空間プレフィックス (samlp:, saml2:, ...) が送信側によって
 * バラバラなので、検索は常に local-name() ベースの XPath を使い、プレフィックスに
 * 依存しないようにする。これは実運用の SAML 実装でも定番のテクニック。
 */
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as xpath from "xpath";

/** SAML で使う名前空間 URI。 */
export const NS = {
  samlp: "urn:oasis:names:tc:SAML:2.0:protocol",
  saml: "urn:oasis:names:tc:SAML:2.0:assertion",
  md: "urn:oasis:names:tc:SAML:2.0:metadata",
  ds: "http://www.w3.org/2000/09/xmldsig#",
} as const;

export function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "text/xml") as unknown as Document;
}

export function serialize(node: Node): string {
  return new XMLSerializer().serializeToString(node as never);
}

/** XPath にマッチする全ノードを返す。 */
export function selectAll(expr: string, node: Node): Node[] {
  return xpath.select(expr, node as never) as unknown as Node[];
}

/** XPath にマッチする最初のノードを返す。 */
export function selectOne(expr: string, node: Node): Node | undefined {
  return (xpath.select1(expr, node as never) as Node) ?? undefined;
}

/** XPath にマッチするノードのテキストを返す。 */
export function text(expr: string, node: Node): string | undefined {
  return selectOne(expr, node)?.textContent ?? undefined;
}

/** 要素の属性値を返す。 */
export function attr(node: Node | undefined, name: string): string | undefined {
  const el = node as Element | undefined;
  return el?.getAttribute?.(name) ?? undefined;
}

/** XML テキスト/属性値に埋め込む文字列をエスケープする。 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** PEM 証明書 → メタデータ等に埋め込む base64 本文 (ヘッダ・改行を除去)。 */
export function certToBase64(pem: string): string {
  return pem
    .replace(/-----(BEGIN|END) CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
}

/** base64 本文 → PEM 証明書 (メタデータから取り出した証明書を署名検証に使う)。 */
export function base64ToCert(b64: string): string {
  const body = b64.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`;
}
