/** インメモリのテストユーザー。学習用なので平文パスワード。 */
import type { SamlUser } from "../saml/types";

interface Account extends SamlUser {
  password: string;
}

const accounts: Record<string, Account> = {
  alice: {
    username: "alice",
    password: "password",
    nameId: "alice@example.com",
    attributes: { displayName: "Alice", email: "alice@example.com", role: "admin" },
  },
  bob: {
    username: "bob",
    password: "password",
    nameId: "bob@example.com",
    attributes: { displayName: "Bob", email: "bob@example.com", role: "user" },
  },
};

/** 認証成功なら SamlUser(パスワードを除く)を返す。 */
export function authenticate(username: string, password: string): SamlUser | undefined {
  const a = accounts[username];
  if (!a || a.password !== password) return undefined;
  const { password: _pw, ...user } = a;
  return user;
}
