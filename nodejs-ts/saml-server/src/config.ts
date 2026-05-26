/**
 * IdP / SP の構成を1か所に集約する。
 * entityId・各エンドポイントURL・ポート・証明書のパスをここで定義し、
 * saml コア / idp サーバー / sp サーバーの全てが参照する。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, ".."); // saml-server/
const CERT_DIR = join(ROOT, "certs");

export const PORTS = { idp: 8001, sp: 8002 } as const;

const IDP_BASE = `http://localhost:${PORTS.idp}`;
const SP_BASE = `http://localhost:${PORTS.sp}`;

/** IdP(認証サーバー)のエンドポイント。entityId は慣習的に metadata の URL を使う。 */
export const idp = {
  entityId: `${IDP_BASE}/idp/metadata`,
  base: IDP_BASE,
  metadataUrl: `${IDP_BASE}/idp/metadata`,
  ssoUrl: `${IDP_BASE}/idp/sso`, // GET=HTTP-Redirect, POST=HTTP-POST
  sloUrl: `${IDP_BASE}/idp/slo`,
} as const;

/** SP(動作確認用クライアント)のエンドポイント。 */
export const sp = {
  entityId: `${SP_BASE}/sp/metadata`,
  base: SP_BASE,
  metadataUrl: `${SP_BASE}/sp/metadata`,
  acsUrl: `${SP_BASE}/sp/acs`, // Assertion Consumer Service (HTTP-POST)
  sloUrl: `${SP_BASE}/sp/slo`,
} as const;

export interface KeyPair {
  /** PEM 形式の秘密鍵 (署名に使用)。 */
  privateKey: string;
  /** PEM 形式の公開証明書 (メタデータに公開し、相手が署名検証に使用)。 */
  certificate: string;
}

function load(name: "idp" | "sp"): KeyPair {
  try {
    return {
      privateKey: readFileSync(join(CERT_DIR, `${name}.key`), "utf8"),
      certificate: readFileSync(join(CERT_DIR, `${name}.crt`), "utf8"),
    };
  } catch {
    throw new Error(
      `証明書が見つかりません (certs/${name}.key, certs/${name}.crt)。\n` +
        `先に "pnpm gen-certs" を実行してください。`,
    );
  }
}

// サーバー起動時に初めて読み込む(テストは独自の鍵を使うため読み込まれない)。
let idpCache: KeyPair | undefined;
let spCache: KeyPair | undefined;
export const idpKeys = (): KeyPair => (idpCache ??= load("idp"));
export const spKeys = (): KeyPair => (spCache ??= load("sp"));

// 相手の「公開証明書だけ」が欲しい場面用 (署名検証)。
// IdP は SP の証明書で AuthnRequest を、SP は IdP の証明書で Response を検証する。
export const idpCertificate = (): string => idpKeys().certificate;
export const spCertificate = (): string => spKeys().certificate;
