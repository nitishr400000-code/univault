import { describe, expect, it } from "vitest";

import { appRouter } from "./index";

const callerFor = (role: string, emailVerified = true) =>
  appRouter.createCaller({
    auth: {} as never,
    db: {} as never,
    headers: new Headers(),
    photoStorage: {} as never,
    session: {
      session: {
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        id: "session-id",
        token: "session-token",
        updatedAt: new Date(),
        userId: "reviewer-id",
      },
      user: {
        createdAt: new Date(),
        email: "reviewer@college.edu",
        emailVerified,
        id: "reviewer-id",
        name: "Review User",
        role,
        updatedAt: new Date(),
      },
    } as never,
  });

const reviewProcedures = (role: string, emailVerified = true) =>
  callerFor(role, emailVerified).claims as unknown as {
    approve: (input: { claimId: string }) => Promise<unknown>;
    reject: (input: { claimId: string }) => Promise<unknown>;
    reviewQueue: () => Promise<unknown>;
  };

const callReviewQueue = (role: string, emailVerified = true) =>
  reviewProcedures(role, emailVerified).reviewQueue();

const reviewClaim = (role: string, action: "approve" | "reject") =>
  reviewProcedures(role)[action]({
    claimId: "00000000-0000-4000-8000-000000000001",
  });

describe("staff-only claim review", () => {
  it("refuses students and system administrators before reading the queue", async () => {
    await expect(callReviewQueue("student")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(callReviewQueue("system_admin")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses unverified staff before reading the queue", async () => {
    await expect(callReviewQueue("staff", false)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses non-staff users from approving or rejecting claims", async () => {
    const actions = ["approve", "reject"] as const;
    await Promise.all(
      ["student", "system_admin"].flatMap((role) =>
        actions.map((action) =>
          expect(reviewClaim(role, action)).rejects.toMatchObject({
            code: "FORBIDDEN",
          })
        )
      )
    );
  });
});
