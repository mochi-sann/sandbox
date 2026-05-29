/**
 * メモの CRUD。すべてログイン必須(SP セッション)で、データはログインユーザーの
 * NameID に紐づく。未ログインならログインへ誘導する。
 *
 * 注: 学習用のため CSRF 対策は省略している(本番では必須)。
 */
import type { Hono } from "hono";
import { currentUser } from "../auth";
import { memoStore } from "../memos";

export function registerMemos(app: Hono): void {
  app.post("/sp/memos", async (c) => {
    const session = currentUser(c);
    if (!session) return c.redirect("/sp/login");

    const body = await c.req.parseBody();
    const text = String(body["text"] ?? "").trim();
    if (text) memoStore.add(session.nameId, text);
    return c.redirect("/sp/");
  });

  app.post("/sp/memos/:id/toggle", (c) => {
    const session = currentUser(c);
    if (!session) return c.redirect("/sp/login");
    memoStore.toggle(session.nameId, c.req.param("id"));
    return c.redirect("/sp/");
  });

  app.post("/sp/memos/:id/delete", (c) => {
    const session = currentUser(c);
    if (!session) return c.redirect("/sp/login");
    memoStore.remove(session.nameId, c.req.param("id"));
    return c.redirect("/sp/");
  });
}
