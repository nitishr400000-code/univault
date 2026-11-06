import { createDb } from "@univault/db";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const db = createDb({
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});

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

describe("admin user listing", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("rejects a signed-in student before reading users", async () => {
    const caller = appRouter.createCaller({ db, session: session("student") });
    await expect(caller.admin.listUsers()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a system admin to list users from PostgreSQL", async () => {
    const caller = appRouter.createCaller({
      db,
      session: session("system_admin"),
    });
    await expect(caller.admin.listUsers()).resolves.toEqual(expect.any(Array));
  });
});
