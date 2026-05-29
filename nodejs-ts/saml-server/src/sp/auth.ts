/**
 * アプリ側のセッション取得ヘルパ。
 * SAML ログイン後は cookie(sp_sid) で識別する自前セッションを使う。
 */
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { spStore, type SpSession } from "./store";

/** 現在ログイン中のセッション。未ログインなら undefined。 */
export function currentUser(c: Context): SpSession | undefined {
  return spStore.getSession(getCookie(c, "sp_sid"));
}
