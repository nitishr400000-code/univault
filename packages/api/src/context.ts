import type { Session } from "@univault/auth";
import type { Database } from "@univault/db";

export type Context = {
  session: Session | null;
  db: Database;
};
