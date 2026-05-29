/** SP (動作確認用のデモ・サービス) のエントリポイント。 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { PORTS, sp } from "../config";
import { registerMetadata } from "./routes/metadata";
import { registerLogin } from "./routes/login";
import { registerAcs } from "./routes/acs";
import { registerMemos } from "./routes/memos";
import { registerHome } from "./routes/home";
import { registerSlo } from "./routes/slo";

const app = new Hono();

registerMetadata(app);
registerLogin(app);
registerAcs(app);
registerMemos(app);
registerSlo(app);
registerHome(app); // "/" と "/sp/" を最後に登録

serve({ fetch: app.fetch, port: PORTS.sp }, (info) => {
  console.log(`SP   listening on http://localhost:${info.port}  entityId=${sp.entityId}`);
});
