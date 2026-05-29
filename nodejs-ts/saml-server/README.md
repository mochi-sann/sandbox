# saml-server — SAML 2.0 学習用 IdP + SP

SAML 2.0 の仕組みを手を動かして理解するための学習用プロジェクト。
**認証サーバー(IdP)** を本体とし、SSO の往復を観察するための **SP(メモ帳アプリ)** を同梱する。

XML 署名(c14n)という最も難しい部分だけ [`xml-crypto`](https://github.com/node-saml/xml-crypto) に任せ、
それ以外(メッセージの組み立て・パース・バインディング・フロー)はすべて自前で実装している。

> ⚠️ 学習用。自己署名証明書・HTTP・インメモリセッション。**本番では使わないこと。**

---

## 用語 (5分で SAML)

| 用語 | 意味 |
|---|---|
| **IdP** (Identity Provider) | ユーザーを認証し、署名付きの「認証済み」証明書(Assertion)を発行する。= 認証サーバー |
| **SP** (Service Provider) | IdP を信頼してログインを任せるサービス。Assertion を検証してログインさせる |
| **AuthnRequest** | SP → IdP。「このユーザーを認証して」という要求 |
| **Assertion** | IdP が発行する「この人は誰で、属性はこれ」という署名付きの主張。SAML の本体 |
| **Response** | IdP → SP。Assertion を包む封筒 |
| **Binding** | メッセージの運び方。HTTP-Redirect(クエリに載せる) / HTTP-POST(フォームで送る) |
| **Metadata** | entityID・証明書・エンドポイントを書いた自己紹介カード。信頼の確立に使う |
| **SLO** (Single Logout) | 一括ログアウト |

---

## SP-initiated SSO のフロー

```
 ブラウザ              SP (:8002)                 IdP (:8001)
   |  GET /sp/login       |                           |
   |--------------------->|  AuthnRequest を生成        |
   |   302 Redirect (?SAMLRequest=...&Signature=...)   |
   |---------------------------------- HTTP-Redirect ->|  クエリ署名を検証
   |                      |                           |  未ログイン → ログイン画面
   |<------------------------------- 302 /idp/login ---|
   |  POST /idp/login (alice/password)                 |
   |-------------------------------------------------->|  認証 → Assertion を署名
   |<-------- 200 自動 POST フォーム (SAMLResponse) ----|
   |  POST /sp/acs (SAMLResponse)                      |
   |--------------------->|  署名/宛先/期限/対応を検証   |
   |   302 /sp/           |  → SP セッション確立        |
   |<---------------------|                           |
   |  GET /sp/ → ログイン中・属性表示                    |
```

- **SP → IdP** は HTTP-Redirect バインディング。AuthnRequest は圧縮して URL に載せ、
  **クエリ文字列全体**を SP の鍵で署名する(`src/saml/redirect-binding.ts`)。
- **IdP → SP** は HTTP-POST バインディング。**Assertion 内部に XML-DSig** を埋め込む(`src/saml/sign-xml.ts`)。

---

## ディレクトリ

```
src/
  config.ts            entityId・エンドポイント・証明書を集約
  saml/                ★FW非依存の低レベル SAML コア
    xml.ts             DOM/XPath ヘルパ・名前空間
    ids.ts             ID・時刻の生成
    sign-xml.ts        XML-DSig 署名/検証 (xml-crypto)。証明書ピン留め
    redirect-binding.ts deflate + クエリ署名/検証
    post-binding.ts    base64 + 自動 POST フォーム
    authn-request.ts / assertion.ts / response.ts / metadata.ts / logout.ts
  idp/                 ★認証サーバー (Hono, :8001)
    routes/ metadata, sso, login, init, slo
  sp/                  ★SP = メモ帳アプリ (Hono, :8002)
    auth.ts            アプリ側セッションの取得ヘルパ
    memos.ts           メモのインメモリ・ストア (NameID ごと)
    routes/ metadata, login, acs, home(アプリUI), memos(CRUD), slo
test/                  コアの往復・改ざん・XSW・検証テスト
```

---

## セットアップと起動

```bash
pnpm install
pnpm gen-certs        # certs/{idp,sp}.{key,crt} を生成 (openssl)
pnpm test             # コアのテスト
pnpm dev              # IdP(:8001) と SP(:8002) を同時起動
```

ブラウザで試す:

1. **SP-initiated**: <http://localhost:8002/sp/> → 「SAML でログイン」→ `alice`/`password` → メモ帳が開く
2. **IdP-initiated**: <http://localhost:8001/idp/init> → ログイン → メモ帳へ
3. **メタデータ**: <http://localhost:8001/idp/metadata> / <http://localhost:8002/sp/metadata>
4. **SLO**: メモ帳の「ログアウト」→ 両者のセッションが破棄される

テストユーザー: `alice` / `password` (role=admin), `bob` / `password` (role=user)

---

## サンプルアプリ: メモ帳 (SAML 統合パターン)

SP(:8002) は SAML でログインするメモ帳アプリ。ログイン後はユーザーごとにメモを CRUD できる。

ここで学べる **SAML 統合の実務パターン**:

- **SAML は「入口」だけ**を担う。ログインが済んだら、アプリは `sp_sid` cookie で引く
  **自前のセッション**(`src/sp/store.ts`)でユーザーを識別する。SAML Response を毎回
  検証するわけではない。
- **アプリのデータはユーザーに紐づく**。SAML から受け取るのは「誰か(NameID)」という事実だけ。
  メモは NameID をキーに保存する(`src/sp/memos.ts`)。別ユーザー(alice/bob)のメモは互いに見えない。
- **属性(attributes)は認可に使える**。Assertion の `role`(admin/user)はアプリ画面に表示しており、
  ロールで操作を制限する拡張の足がかりになる。

| メソッド/パス | 役割 |
|---|---|
| `GET  /sp/` | メモ一覧(保護ページ)。未ログインならログイン誘導 |
| `POST /sp/memos` | メモ追加 |
| `POST /sp/memos/:id/toggle` | 完了の切替 |
| `POST /sp/memos/:id/delete` | 削除 |

> 学習用のため CSRF 対策・永続化は省略(本番では必須)。

---

## あなたのタスク: `validateResponse` の論理検証 (TODO(human))

`src/saml/response.ts` の `validateResponse()` には `TODO(human)` がある。
署名検証と XSW 対策は実装済みだが、**「この Assertion を信頼してよいか」の論理検証**(下記3点)が空いている。

- **(a) Audience**: 自分(SP)宛の Assertion か → 他人宛の使い回しを防ぐ
- **(b) 有効期間**: いま `[NotBefore, NotOnOrAfter)` の中か → 期限切れ/未来日付を拒否
- **(c) InResponseTo**: 自分が送った要求への応答か → リプレイ/差し替えを防ぐ

実装前は `pnpm test` で次の3つが**わざと失敗**する(=実装すべき仕様):

```
× Audience が異なる Response は拒否される
× 有効期限切れの Response は拒否される
× InResponseTo が一致しない Response は拒否される
```

これらが緑になれば、SP のログインフローも安全になる。

---

## セキュリティの勘所 (学習ポイント)

- **XSW (XML Signature Wrapping)**: 署名は通っても、消費する Assertion は
  「実際に署名された範囲(`getSignedReferences()`)」から取り出す。元 XML から取ると
  攻撃者が注入した未署名要素を掴むおそれがある (`src/saml/response.ts`)。
- **KeyInfo を信用しない**: 検証は XML 内の証明書ではなく、メタデータで事前共有した
  証明書に**ピン留め**する。さもないと攻撃者が自分の鍵で署名し放題になる (`src/saml/sign-xml.ts`)。
- **未要請レスポンス対策**: SP は自分が送った AuthnRequest の ID を覚え、Response の
  `InResponseTo` がそれに一致するか確認する (`src/sp/store.ts`, `src/sp/routes/acs.ts`)。
```
