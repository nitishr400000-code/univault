import { describe, expect, it } from "vitest";

import { appRouter } from "./index";

const contextFor = (role = "student", emailVerified = true) => ({
  auth: {} as never,
  db: {} as never,
  headers: new Headers(),
  photoStorage: {} as never,
  session: {
    session: {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      id: "claim-test-session",
      token: "claim-test-token",
      updatedAt: new Date(),
      userId: "claim-test-user",
    },
    user: {
      createdAt: new Date(),
      email: "claimant@college.edu",
      emailVerified,
      id: "claim-test-user",
      name: "Claimant",
      role,
      updatedAt: new Date(),
    },
  } as never,
});

interface ClaimsCaller {
  claims: {
    submit: (input: { itemId: string; proofNote: string }) => Promise<unknown>;
  };
}

const callerFor = (role?: string, emailVerified?: boolean) =>
  appRouter.createCaller(contextFor(role, emailVerified)) as unknown as ClaimsCaller;

describe("claim submission validation", () => {
  it("requires a non-empty proof note", async () => {
    await expect(
      callerFor().claims.submit({
        itemId: "ea734021-f6b2-4eaa-bd74-9d7ac51822b7",
        proofNote: "   ",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses claims from unverified users before accessing the database", async () => {
    await expect(
      callerFor("student", false).claims.submit({
        itemId: "ea734021-f6b2-4eaa-bd74-9d7ac51822b7",
        proofNote: "A scratch mark on the back left corner",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses claims from system administrators before accessing the database", async () => {
    await expect(
      callerFor("system_admin").claims.submit({
        itemId: "ea734021-f6b2-4eaa-bd74-9d7ac51822b7",
        proofNote: "A scratch mark on the back left corner",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
