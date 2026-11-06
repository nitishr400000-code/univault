import { createAuth } from "@univault/auth";
import { seedSystemAdmin } from "@univault/auth/seed-admin";
import { createDb } from "@univault/db";
import { afterAll, describe, expect, it } from "vitest";

const db = createDb({
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});
const auth = createAuth(
  {
    BETTER_AUTH_SECRET: "test-secret-with-more-than-thirty-two-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:3001",
  },
  db
);

describe("campus authentication", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("assigns student to a new signup by default", async () => {
    const email = `student-${crypto.randomUUID()}@college.edu`;
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        body: JSON.stringify({
          email,
          name: "New Student",
          password: "long-test-password",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    const createdUser = await db.query.user.findFirst({ where: { email } });
    expect(createdUser?.role).toBe("student");
  });

  it("seeds the configured system admin idempotently", async () => {
    const email = `admin-${crypto.randomUUID()}@college.edu`;
    const seed = { email, name: "Test Admin", password: "long-test-password" };
    const firstId = await seedSystemAdmin(auth, db, seed);
    const secondId = await seedSystemAdmin(auth, db, seed);

    expect(secondId).toBe(firstId);
    expect(await db.query.user.findFirst({ where: { email } })).toMatchObject({
      id: firstId,
      role: "system_admin",
    });
    const credentials = await db.query.account.findMany({
      where: { providerId: "credential", userId: firstId },
    });
    expect(credentials).toHaveLength(1);
  });
});
