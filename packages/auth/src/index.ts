import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@univault/db";
import * as schema from "@univault/db/schema/auth";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";

import { authAccessControl, authRoles } from "./roles";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  CAMPUS_EMAIL_DOMAIN: string;
  NODE_ENV: "development" | "production" | "test";
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
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ url }) => {
        if (env.NODE_ENV === "development") {
          console.log(`Email verification URL: ${url}`);
        }
        await Promise.resolve();
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== "/sign-up/email") {
          return;
        }
        const email = String(context.body.email ?? "")
          .trim()
          .toLowerCase();
        const domain = env.CAMPUS_EMAIL_DOMAIN.trim()
          .replace(/^@/u, "")
          .toLowerCase();
        if (!email.endsWith(`@${domain}`)) {
          throw new APIError("FORBIDDEN", {
            message: `Sign up with your ${domain} campus email address.`,
          });
        }
        await Promise.resolve();
      }),
    },
    plugins: [
      admin({
        ac: authAccessControl,
        adminRoles: ["system_admin"],
        bannedUserMessage:
          "Your account has been banned. Contact campus support.",
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
export type Auth = ReturnType<typeof createAuth>;
