/**
 * HTTP-Redirect バインディング。
 *
 * SAML メッセージを URL のクエリに載せて GET リダイレクトで送る方式。AuthnRequest など
 * 短いメッセージに使われる。手順:
 *   1. XML を raw DEFLATE 圧縮 (zlib のヘッダ無し) する … URL を短くするため
 *   2. base64 エンコード
 *   3. URL エンコードして SAMLRequest / SAMLResponse パラメータに載せる
 *
 * 署名は XML-DSig ではなく「クエリ文字列そのもの」に対して行う(detached signature)。
 * 署名対象の文字列は、仕様で順序が決まっている:
 *     SAMLRequest=<値>&RelayState=<値>&SigAlg=<値>   (RelayState は有れば)
 * これを RSA-SHA256 で署名し、結果を base64 にして &Signature= に付ける。
 */
import { createSign, createVerify } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const SIG_ALG = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";

export interface BuildRedirectOptions {
  /** 送信先 (相手の SSO / SLO エンドポイント)。 */
  endpoint: string;
  /** SAML メッセージ XML。 */
  xml: string;
  /** "SAMLRequest" (要求) か "SAMLResponse" (応答) か。 */
  param: "SAMLRequest" | "SAMLResponse";
  relayState?: string;
  /** 署名する場合の秘密鍵 (PEM)。省略で未署名。 */
  privateKey?: string;
}

/** Redirect バインディング用の完全な URL を組み立てる。 */
export function buildRedirectUrl(opts: BuildRedirectOptions): string {
  const deflated = deflateRawSync(Buffer.from(opts.xml, "utf8")).toString("base64");

  const parts = [`${opts.param}=${encodeURIComponent(deflated)}`];
  if (opts.relayState != null) {
    parts.push(`RelayState=${encodeURIComponent(opts.relayState)}`);
  }

  if (!opts.privateKey) {
    return `${opts.endpoint}?${parts.join("&")}`;
  }

  // 署名対象には SigAlg まで含める(順序が重要)。
  parts.push(`SigAlg=${encodeURIComponent(SIG_ALG)}`);
  const signBase = parts.join("&");

  const signer = createSign("RSA-SHA256");
  signer.update(signBase);
  const signature = signer.sign(opts.privateKey, "base64");

  return `${opts.endpoint}?${signBase}&Signature=${encodeURIComponent(signature)}`;
}

export interface ParseRedirectResult {
  xml: string;
  relayState?: string;
  /** 署名が存在し検証成功なら true。未署名なら undefined。 */
  signatureValid?: boolean;
}

/**
 * 受信したクエリ文字列(?以降、生のまま)を解析する。
 * @param rawQuery URL の "?" を除いた生のクエリ文字列
 * @param certificate 署名検証に使う相手の証明書 (PEM)。未指定なら検証しない。
 */
export function parseRedirect(rawQuery: string, certificate?: string): ParseRedirectResult {
  // 署名検証は「受信した生のエンコード済み値」に対して行う必要があるため、
  // decode せずに key→raw値 のまま保持する。
  const raw = new Map<string, string>();
  for (const seg of rawQuery.split("&")) {
    const i = seg.indexOf("=");
    if (i >= 0) raw.set(seg.slice(0, i), seg.slice(i + 1));
  }

  const param = raw.has("SAMLRequest") ? "SAMLRequest" : "SAMLResponse";
  const rawMsg = raw.get(param);
  if (rawMsg == null) throw new Error("SAMLRequest / SAMLResponse がクエリに無い");

  const xml = inflateRawSync(
    Buffer.from(decodeURIComponent(rawMsg), "base64"),
  ).toString("utf8");

  const relayState = raw.has("RelayState")
    ? decodeURIComponent(raw.get("RelayState")!)
    : undefined;

  let signatureValid: boolean | undefined;
  const rawSignature = raw.get("Signature");
  if (rawSignature != null && certificate) {
    // 署名対象文字列を仕様の順序で再構築 (受信した生の値をそのまま使う)。
    const order = [param, "RelayState", "SigAlg"].filter((k) => raw.has(k));
    const signBase = order.map((k) => `${k}=${raw.get(k)}`).join("&");

    const verifier = createVerify("RSA-SHA256");
    verifier.update(signBase);
    signatureValid = verifier.verify(
      certificate,
      decodeURIComponent(rawSignature),
      "base64",
    );
  }

  return { xml, relayState, signatureValid };
}
