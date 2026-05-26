/**
 * IdP の状態(インメモリ)。
 * - sessions: ログイン済みユーザーの IdP セッション (cookie の sid で引く)。
 * - pending : 「ログイン待ち」の SSO 要求コンテキスト。ログインフォームへ飛ばす間、
 *             どの SP のどの要求への応答かを覚えておく。rid をフォームに埋めて持ち回る。
 */
import { randomUUID } from "node:crypto";
import type { SamlUser } from "../saml/types";

export interface IdpSession {
  user: SamlUser;
  sessionIndex: string;
}

export interface PendingSso {
  spEntityId: string;
  acsUrl: string;
  inResponseTo?: string; // SP-initiated のときの AuthnRequest ID
  relayState?: string;
}

const sessions = new Map<string, IdpSession>();
const pending = new Map<string, PendingSso>();

export const idpStore = {
  createSession(s: IdpSession): string {
    const sid = randomUUID();
    sessions.set(sid, s);
    return sid;
  },
  getSession(sid?: string): IdpSession | undefined {
    return sid ? sessions.get(sid) : undefined;
  },
  destroySession(sid?: string): void {
    if (sid) sessions.delete(sid);
  },

  putPending(p: PendingSso): string {
    const rid = randomUUID();
    pending.set(rid, p);
    return rid;
  },
  takePending(rid?: string): PendingSso | undefined {
    if (!rid) return undefined;
    const p = pending.get(rid);
    if (p) pending.delete(rid);
    return p;
  },
};
