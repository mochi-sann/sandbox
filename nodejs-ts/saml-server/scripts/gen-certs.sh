#!/usr/bin/env bash
#
# IdP / SP それぞれの自己署名証明書(RSA 2048bit)を生成する。
# - *.key : 署名に使う秘密鍵 (PEM, 暗号化なし)
# - *.crt : 公開証明書 (PEM)。メタデータに埋め込み、相手が署名検証に使う。
#
# 学習用途のため暗号化なし・自己署名。本番では使わないこと。
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "$CERT_DIR"

for name in idp sp; do
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$CERT_DIR/$name.key" \
    -out "$CERT_DIR/$name.crt" \
    -days 3650 \
    -subj "/CN=$name.localhost/O=SAML Learning/C=JP" \
    >/dev/null 2>&1
  echo "generated: certs/$name.key, certs/$name.crt"
done

echo "done."
