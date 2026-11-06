import { createAuth } from "@univault/auth";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { afterAll, describe, expect, it } from "vitest";
import "@univault/db/test/setup";

import { appRouter } from "./index";

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

const session = (role: string) =>
  ({
    session: {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      id: "session-id",
      token: "session-token",
      updatedAt: new Date(),
      userId: "user-id",
    },
    user: {
      createdAt: new Date(),
      email: "person@example.edu",
      emailVerified: true,
      id: "user-id",
      name: "Person",
      role,
      updatedAt: new Date(),
    },
  }) as never;

const callerFor = (role: string) =>
  appRouter.createCaller({
    auth,
    db,
    headers: new Headers(),
    session: session(role),
  });

const requestAuth = (path: string, init?: RequestInit) =>
  auth.handler(new Request(`http://localhost:3000/api/auth${path}`, init));

const sessionCookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");

const createAccount = async (role = "student") => {
  const email = `admin-user-${crypto.randomUUID()}@college.edu`;
  const password = "long-test-password";
  const created = await requestAuth("/sign-up/email", {
    body: JSON.stringify({ email, name: "Admin Target", password }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(created.status).toBe(200);
  const createdUser = (await created.json()) as { user: { id: string } };
  await db.update(user).set({ emailVerified: true, role }).where({ email });
  return { email, id: createdUser.user.id, password };
};

const authenticatedCaller = async (role: string) => {
  const account = await createAccount(role);
  const signedIn = await requestAuth("/sign-in/email", {
    body: JSON.stringify({ email: account.email, password: account.password }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  expect(signedIn.status).toBe(200);
  const headers = new Headers({ cookie: sessionCookie(signedIn) });
  const activeSession = await auth.api.getSession({ headers });
  if (!activeSession) {
    throw new Error("Test account did not get a session");
  }
  return {
    account,
    caller: appRouter.createCaller({
      auth,
      db,
      headers,
      session: activeSession,
    }),
    headers,
  };
};

describe("admin user listing", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("rejects a signed-in student before reading users", async () => {
    const caller = callerFor("student");
    await expect(caller.admin.listUsers()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a system admin to list users from PostgreSQL", async () => {
    const caller = callerFor("system_admin");
    await expect(caller.admin.listUsers()).resolves.toEqual(expect.any(Array));
  });

  it("finds users by name or campus email", async () => {
    const id = crypto.randomUUID();
    const email = `search-${id}@college.edu`;
    await db.insert(user).values({
      email,
      emailVerified: true,
      id,
      name: "Asha Searchable",
      role: "student",
    });
    const caller = callerFor("system_admin");

    const byName = await caller.admin.listUsers({ search: "Asha Searchable" });
    const byEmail = await caller.admin.listUsers({ search: email });

    expect(byName).toEqual([
      expect.objectContaining({ id, name: "Asha Searchable" }),
    ]);
    expect(byEmail).toEqual([expect.objectContaining({ email, id })]);
  });

  it("grants and removes the staff role", async () => {
    const { account: target, headers: targetHeaders } =
      await authenticatedCaller("student");
    const { caller } = await authenticatedCaller("system_admin");

    await caller.admin.grantStaff({ userId: target.id });
    await expect(
      auth.api.getSession({ headers: targetHeaders })
    ).resolves.toMatchObject({ user: { role: "staff" } });

    await caller.admin.removeStaff({ userId: target.id });
    await expect(
      auth.api.getSession({ headers: targetHeaders })
    ).resolves.toMatchObject({ user: { role: "student" } });
  });

  it("deactivates users without expiry and revokes their sessions", async () => {
    const { account: target, headers } = await authenticatedCaller("student");
    const { caller } = await authenticatedCaller("system_admin");

    await caller.admin.deactivateUser({ userId: target.id });

    await expect(auth.api.getSession({ headers })).resolves.toBeNull();
  });

  it("reactivates a deactivated user", async () => {
    const target = await createAccount();
    const { caller } = await authenticatedCaller("system_admin");

    await caller.admin.deactivateUser({ userId: target.id });
    await caller.admin.reactivateUser({ userId: target.id });

    const signedIn = await requestAuth("/sign-in/email", {
      body: JSON.stringify({ email: target.email, password: target.password }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(signedIn.status).toBe(200);
  });
});
