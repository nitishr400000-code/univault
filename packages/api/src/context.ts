import type { Auth, Session } from "@univault/auth";
import type { Database } from "@univault/db";

import type { PhotoStorage } from "./photo-storage";

export interface Context extends Record<string, unknown> {
  auth: Auth;
  headers: Headers;
  session: Session | null;
  db: Database;
  photoStorage: PhotoStorage;
}
