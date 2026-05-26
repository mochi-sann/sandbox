/** テスト用の鍵ペア生成。openssl 不要で自己署名証明書を作る。 */
import selfsigned from "selfsigned";

export interface TestKeyPair {
  privateKey: string;
  certificate: string;
}

export function makeKeyPair(cn = "test"): TestKeyPair {
  const pems = selfsigned.generate([{ name: "commonName", value: cn }], {
    keySize: 2048,
    days: 365,
    algorithm: "sha256",
  });
  return { privateKey: pems.private, certificate: pems.cert };
}
