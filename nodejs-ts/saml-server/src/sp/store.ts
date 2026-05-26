/**
 * SP の状態(インメモリ)。
 * - sessions      : ログイン済みユーザーの SP セッション (cookie の sid で引く)。
 * - sentRequests  : 自分が送った AuthnRequest の ID 集合。受け取った Response の
 *                   InResponseTo がここに無ければ「身に覚えのない応答」として拒否する
 *                   (未要請レスポンス/リプレイ対策)。
 */
import { randomUUID } from "node:crypto";

export interface SpSession {
  nameId: string;
  attributes: Record<string, string>;
  sessionIndex?: string;
}

const sessions = new Map<string, SpSession>();
const sentRequests = new Set<string>();

export const spStore = {
  createSession(s: SpSession): string {
    const sid = randomUUID();
    sessions.set(sid, s);
    return sid;
  },
  getSession(sid?: string): SpSession | undefined {
    return sid ? sessions.get(sid) : undefined;
  },
  destroySession(sid?: string): void {
    if (sid) sessions.delete(sid);
  },

  rememberRequest(id: string): void {
    sentRequests.add(id);
  },
  /** 既知の要求なら true を返し、その ID を消費する(使い回しを防ぐ)。 */
  consumeRequest(id: string): boolean {
    return sentRequests.delete(id);
  },
};
