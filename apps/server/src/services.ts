import { createAuth } from "@univault/auth";
import { createDb } from "@univault/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
