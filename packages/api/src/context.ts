import type { Auth, Session } from "@univault/auth";
import type { Database } from "@univault/db";

export interface Context extends Record<string, unknown> {
  auth: Auth;
  headers: Headers;
  session: Session | null;
  db: Database;
}
