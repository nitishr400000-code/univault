import type { Session } from "@univault/auth";
import type { Database } from "@univault/db";

export interface Context extends Record<string, unknown> {
  session: Session | null;
  db: Database;
}
