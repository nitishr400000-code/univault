import { createAuth } from "@univault/auth";
import { seedSystemAdmin } from "@univault/auth/seed-admin";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { eq } from "drizzle-orm";
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

const requestAuth = (path: string, init?: RequestInit) =>
  auth.handler(new Request(`http://localhost:3000/api/auth${path}`, init));

const signUpVerifiedUser = async () => {
  const email = `account-${crypto.randomUUID()}@college.edu`;
  const password = "long-test-password";
  const signUp = await requestAuth("/sign-up/email", {
    body: JSON.stringify({ email, name: "Campus User", password }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(signUp.status).toBe(200);
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.email, email));
  return { email, password };
};

const signIn = (email: string, password: string) =>
  requestAuth("/sign-in/email", {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

const sessionCookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");

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

  it("allows a verified campus user to sign in with email and password", async () => {
    const account = await signUpVerifiedUser();

    const response = await signIn(account.email, account.password);

    expect(response.status).toBe(200);
    expect(sessionCookie(response)).toContain("better-auth.session_token=");
  });

  it("ends the server session when the user signs out", async () => {
    const account = await signUpVerifiedUser();
    const signedIn = await signIn(account.email, account.password);
    const cookie = sessionCookie(signedIn);

    expect(cookie).toContain("better-auth.session_token=");
    const beforeSignOut = await requestAuth("/get-session", {
      headers: { cookie },
    });
    expect(beforeSignOut.status).toBe(200);
    expect(await beforeSignOut.json()).toMatchObject({
      user: { email: account.email },
    });

    const signedOut = await requestAuth("/sign-out", {
      body: "{}",
      headers: { "content-type": "application/json", cookie },
      method: "POST",
    });
    expect(signedOut.status).toBe(200);

    const afterSignOut = await requestAuth("/get-session", {
      headers: { cookie },
    });
    expect(await afterSignOut.json()).toBeNull();
  });

  it("lets a signed-in user change their name without changing campus email", async () => {
    const account = await signUpVerifiedUser();
    const signedIn = await signIn(account.email, account.password);

    const response = await requestAuth("/update-user", {
      body: JSON.stringify({ name: "Updated Campus Name" }),
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie(signedIn),
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      email: account.email,
      name: "Updated Campus Name",
    });
  });

  it("refuses sign-in for a banned user with the configured plugin message", async () => {
    const account = await signUpVerifiedUser();
    await db
      .update(user)
      .set({ banned: true })
      .where(eq(user.email, account.email));

    const response = await signIn(account.email, account.password);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining("Your account has been banned"),
    });
  });
});
