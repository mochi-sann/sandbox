/**
 * メモのインメモリ・ストア。
 * SAML から受け取るのは「誰か(NameID)」という事実だけ。アプリのデータ(メモ)は
 * その NameID に紐づけて自前で管理する — これが SAML 統合の典型パターン。
 */
import { randomUUID } from "node:crypto";

export interface Memo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

// key: ユーザーの NameID
const byUser = new Map<string, Memo[]>();

export const memoStore = {
  list(nameId: string): Memo[] {
    return byUser.get(nameId) ?? [];
  },
  add(nameId: string, text: string): Memo {
    const memo: Memo = {
      id: randomUUID(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    const list = byUser.get(nameId) ?? [];
    list.unshift(memo);
    byUser.set(nameId, list);
    return memo;
  },
  toggle(nameId: string, id: string): void {
    const memo = byUser.get(nameId)?.find((m) => m.id === id);
    if (memo) memo.done = !memo.done;
  },
  remove(nameId: string, id: string): void {
    const list = byUser.get(nameId);
    if (list) byUser.set(nameId, list.filter((m) => m.id !== id));
  },
};
