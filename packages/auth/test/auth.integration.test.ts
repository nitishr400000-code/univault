import { createAuth } from "@univault/auth";
import { seedSystemAdmin } from "@univault/auth/seed-admin";
import { createDb } from "@univault/db";
import { afterAll, describe, expect, it, vi } from "vitest";

const db = createDb({
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});
const auth = createAuth(
  {
    BETTER_AUTH_SECRET: "test-secret-with-more-than-thirty-two-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    CAMPUS_EMAIL_DOMAIN: "college.edu",
    CORS_ORIGIN: "http://localhost:3001",
    NODE_ENV: "test",
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
    expect(createdUser?.emailVerified).toBe(false);
  });

  it("rejects signups outside the configured campus email domain", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        body: JSON.stringify({
          email: `outsider-${crypto.randomUUID()}@elsewhere.edu`,
          name: "Outside Student",
          password: "long-test-password",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining("college.edu"),
    });
  });

  it("logs a verification URL in development and that URL verifies signup", async () => {
    const email = `verification-${crypto.randomUUID()}@college.edu`;
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const developmentAuth = createAuth(
      {
        BETTER_AUTH_SECRET: "test-secret-with-more-than-thirty-two-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
        CAMPUS_EMAIL_DOMAIN: "college.edu",
        CORS_ORIGIN: "http://localhost:3001",
        NODE_ENV: "development",
      },
      db
    );

    try {
      const response = await developmentAuth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          body: JSON.stringify({
            email,
            name: "Verify Student",
            password: "long-test-password",
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      );
      expect(response.status).toBe(200);

      const line = log.mock.calls
        .flat()
        .find(
          (value) =>
            typeof value === "string" &&
            value.includes("http://localhost:3000/api/auth/verify-email")
        );
      expect(line).toEqual(expect.any(String));
      const url = String(line).match(/https?:\/\/\S+/u)?.[0];
      if (!url) {
        throw new Error("Verification URL was not logged");
      }
      const verification = await developmentAuth.handler(new Request(url));
      expect(verification.status).toBe(302);
      expect(await db.query.user.findFirst({ where: { email } })).toMatchObject(
        {
          emailVerified: true,
        }
      );
    } finally {
      log.mockRestore();
    }
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
