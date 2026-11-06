import { describe, expect, it } from "vitest";

import { campusMemberProcedure, router } from "../index";
import { appRouter } from "./index";

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
      email: "person@college.edu",
      emailVerified: true,
      id: "user-id",
      name: "Person",
      role,
      updatedAt: new Date(),
    },
  }) as never;

const contextFor = (role: string) => ({
  auth: {} as never,
  db: {} as never,
  headers: new Headers(),
  photoStorage: {} as never,
  session: session(role),
});

describe("system admin permissions", () => {
  it("refuses user management calls from non-admin users", async () => {
    const caller = appRouter.createCaller(contextFor("student"));
    const operations = [
      () => caller.admin.listUsers(),
      () => caller.admin.grantStaff({ userId: "target" }),
      () => caller.admin.removeStaff({ userId: "target" }),
      () => caller.admin.deactivateUser({ userId: "target" }),
      () => caller.admin.reactivateUser({ userId: "target" }),
    ];

    await Promise.all(
      operations.map((operation) =>
        expect(operation()).rejects.toMatchObject({ code: "FORBIDDEN" })
      )
    );
  });

  it("cannot use student and staff operations", async () => {
    const appOperations = router({
      claim: campusMemberProcedure.query(() => "claimed"),
      post: campusMemberProcedure.query(() => "posted"),
      review: campusMemberProcedure.query(() => "reviewed"),
    });
    const caller = appOperations.createCaller(contextFor("system_admin"));

    await expect(caller.post()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.claim()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.review()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
