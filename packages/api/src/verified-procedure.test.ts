import { describe, expect, it } from "vitest";

import { router, verifiedProcedure } from "./index";

const verificationProbe = router({
  protectedAction: verifiedProcedure.query(() => "allowed"),
});

const session = (emailVerified: boolean) =>
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
      emailVerified,
      id: "user-id",
      name: "Person",
      role: "student",
      updatedAt: new Date(),
    },
  }) as never;

describe("verified-user procedure", () => {
  it("rejects an unverified signed-in user", async () => {
    const caller = verificationProbe.createCaller({
      db: {} as never,
      session: session(false),
    });
    await expect(caller.protectedAction()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Email verification required",
    });
  });

  it("allows a verified signed-in user", async () => {
    const caller = verificationProbe.createCaller({
      db: {} as never,
      session: session(true),
    });
    await expect(caller.protectedAction()).resolves.toBe("allowed");
  });
});
