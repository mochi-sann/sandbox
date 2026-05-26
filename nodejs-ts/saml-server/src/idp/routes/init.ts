/**
 * IdP-initiated SSO。
 * AuthnRequest 無しで、IdP 側から直接 SP へ Response を送る。
 * 宛先 SP は構成(我々のデモ SP)から決める。InResponseTo は無い。
 */
import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { sp as spCfg } from "../../config";
import { idpStore, type PendingSso } from "../store";
import { issueResponseForm } from "../issue";

export function registerInit(app: Hono): void {
  app.get("/idp/init", (c) => {
    const pending: PendingSso = {
      spEntityId: spCfg.entityId,
      acsUrl: spCfg.acsUrl,
      // IdP-initiated なので inResponseTo は付けない
    };

    const session = idpStore.getSession(getCookie(c, "idp_sid"));
    if (session) {
      return c.html(issueResponseForm(session.user, pending, session.sessionIndex));
    }
    const rid = idpStore.putPending(pending);
    return c.redirect(`/idp/login?rid=${rid}`);
  });
}
