/** IdP (認証サーバー) のエントリポイント。 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { PORTS, idp } from "../config";
import { registerMetadata } from "./routes/metadata";
import { registerSso } from "./routes/sso";
import { registerLogin } from "./routes/login";
import { registerInit } from "./routes/init";
import { registerSlo } from "./routes/slo";

const app = new Hono();

app.get("/", (c) =>
  c.html(
    `<!doctype html><meta charset="utf-8" /><body style="font-family:sans-serif;max-width:36rem;margin:2rem auto">` +
      `<h1>SAML IdP (認証サーバー)</h1>` +
      `<ul>` +
      `<li><a href="/idp/metadata">/idp/metadata</a> — メタデータ</li>` +
      `<li><a href="/idp/init">/idp/init</a> — IdP-initiated SSO を開始</li>` +
      `</ul>` +
      `<p style="color:#666">SP-initiated は SP 側 (<a href="${PORTS.sp && "http://localhost:" + PORTS.sp}/sp/login">/sp/login</a>) から開始します。</p>` +
      `</body>`,
  ),
);

registerMetadata(app);
registerSso(app);
registerLogin(app);
registerInit(app);
registerSlo(app);

serve({ fetch: app.fetch, port: PORTS.idp }, (info) => {
  console.log(`IdP  listening on http://localhost:${info.port}  entityId=${idp.entityId}`);
});
