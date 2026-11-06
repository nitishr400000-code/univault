import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@univault/db";
import * as schema from "@univault/db/schema/auth";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

import { authAccessControl, authRoles } from "./roles";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
}

export const createAuth = (
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) =>
  betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: { enabled: true },
    plugins: [
      admin({
        ac: authAccessControl,
        adminRoles: ["system_admin"],
        defaultRole: "student",
        roles: authRoles,
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    user: {
      additionalFields: {
        department: { input: true, required: false, type: "string" },
        yearOfStudy: { input: true, required: false, type: "number" },
      },
    },
  });

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
