import type { Database } from "@univault/db";
import { account, user } from "@univault/db/schema/auth";
import { eq } from "drizzle-orm";

import type { createAuth } from "./index";

export interface SystemAdminSeed {
  email: string;
  name: string;
  password: string;
}

export const seedSystemAdmin = async (
  auth: ReturnType<typeof createAuth>,
  db: Database,
  seed: SystemAdminSeed
) => {
  const normalizedEmail = seed.email.trim().toLowerCase();
  const existingUser = await db.query.user.findFirst({
    where: { email: normalizedEmail },
  });
  const userId = existingUser?.id ?? crypto.randomUUID();

  const userWrite = existingUser
    ? db.update(user).set({ role: "system_admin" }).where(eq(user.id, userId))
    : db.insert(user).values({
        email: normalizedEmail,
        emailVerified: true,
        id: userId,
        name: seed.name,
        role: "system_admin",
      });
  await userWrite;

  const credentialAccount = await db.query.account.findFirst({
    where: { providerId: "credential", userId },
  });
  if (!credentialAccount) {
    const authContext = await auth.$context;
    const passwordHash = await authContext.password.hash(seed.password);
    const now = new Date();
    await db.insert(account).values({
      accountId: userId,
      createdAt: now,
      id: crypto.randomUUID(),
      password: passwordHash,
      providerId: "credential",
      updatedAt: now,
      userId,
    });
  }

  return userId;
};
