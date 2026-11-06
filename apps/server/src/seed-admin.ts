import { seedSystemAdmin } from "@univault/auth/seed-admin";

import { ENV } from "./env.server";
import { auth, db } from "./services";

try {
  const email = ENV.SYSTEM_ADMIN_EMAIL;
  const password = ENV.SYSTEM_ADMIN_PASSWORD;
  if (!(email && password)) {
    throw new Error(
      "Set SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD before running the admin seed."
    );
  }
  const userId = await seedSystemAdmin(auth, db, {
    email,
    name: ENV.SYSTEM_ADMIN_NAME ?? "UniVault System Admin",
    password,
  });
  console.log(`System admin is ready (${userId}).`);
} finally {
  await db.$client.end();
}
