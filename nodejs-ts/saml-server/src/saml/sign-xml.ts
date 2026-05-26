/**
 * XML デジタル署名 (XML-DSig) の生成と検証。
 *
 * SAML で最も間違えやすいのがこの部分。XML は「意味が同じでも書き方が無数にある」
 * (空白・属性順・名前空間宣言の位置 …) ため、署名前に "正規化(canonicalization, c14n)"
 * して一意なバイト列にしてからハッシュ・署名する。この c14n の実装は非常に難しいので、
 * ここだけは実績ある xml-crypto に任せ、それ以外(XMLの組み立て/パース/フロー)は自前で書く。
 *
 * 使うアルゴリズム:
 *   - 署名:        RSA-SHA256
 *   - 正規化:      Exclusive XML Canonicalization (exc-c14n)
 *   - ダイジェスト: SHA-256
 *   - Transform:   enveloped-signature (署名要素自身を除外) + exc-c14n
 */
import { SignedXml } from "xml-crypto";
import { parseXml, selectOne } from "./xml";

const SIG_ALG = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";
const DIGEST = "http://www.w3.org/2001/04/xmlenc#sha256";
const ENVELOPED = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

// SAML の ID 属性 (xsd:ID)。Reference の UR="#id" 解決に使われる。
const SIGNATURE_XPATH =
  "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']";

export interface SignOptions {
  privateKey: string;
  certificate: string;
  /** 署名対象の要素を選ぶ XPath (例: Assertion)。その ID 属性が Reference URI になる。 */
  targetXPath: string;
  /** 署名要素を挿入する位置: この XPath の要素の「直後」に入れる (SAML は Issuer の直後)。 */
  insertAfterXPath: string;
}

/**
 * enveloped 署名を作って XML に埋め込む。
 * targetXPath の要素(の ID)を参照し、insertAfterXPath の要素の直後に <ds:Signature> を挿入する。
 */
export function signXml(xml: string, opts: SignOptions): string {
  const sig = new SignedXml({
    privateKey: opts.privateKey,
    publicCert: opts.certificate, // KeyInfo に X509Certificate として埋め込まれる
    signatureAlgorithm: SIG_ALG,
    canonicalizationAlgorithm: C14N,
  });

  sig.addReference({
    xpath: opts.targetXPath,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: DIGEST,
  });

  sig.computeSignature(xml, {
    location: { reference: opts.insertAfterXPath, action: "after" },
  });

  return sig.getSignedXml();
}

/** XML に ds:Signature 要素が含まれるか。 */
export function hasSignature(xml: string): boolean {
  return !!selectOne(SIGNATURE_XPATH, parseXml(xml));
}

export interface VerifyResult {
  valid: boolean;
  /**
   * 実際に署名されていた範囲の XML (正規化後)。
   * XSW 対策: 消費する Assertion はこの "署名された範囲" から取り出すこと。
   * 元ドキュメントから取り出すと、攻撃者が注入した未署名要素を掴むおそれがある。
   */
  signedXml?: string;
  error?: string;
}

/**
 * XML に埋め込まれた署名を、与えられた証明書で検証する。
 */
export function verifyXmlSignature(xml: string, certificate: string): VerifyResult {
  const doc = parseXml(xml);
  const signatureNode = selectOne(SIGNATURE_XPATH, doc);
  if (!signatureNode) return { valid: false, error: "署名要素 <ds:Signature> が見つからない" };

  // 重要: KeyInfo に埋め込まれた証明書を信用してはいけない。
  // 既定の xml-crypto は KeyInfo の X509Certificate で検証してしまうため、攻撃者が
  // 自分の鍵で署名し自分の証明書を埋め込むと「有効」になってしまう。
  // getCertFromKeyInfo を無効化し、メタデータで事前共有した証明書(certificate)に
  // "ピン留め" して検証する。
  const sig = new SignedXml({
    publicCert: certificate,
    getCertFromKeyInfo: () => null,
  });
  sig.loadSignature(signatureNode as never);

  try {
    const valid = sig.checkSignature(xml);
    // getSignedReferences(): 改ざんされていないと保証される「署名された範囲」のバイト列。
    const refs = sig.getSignedReferences();
    return { valid, signedXml: refs?.[0] };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}
