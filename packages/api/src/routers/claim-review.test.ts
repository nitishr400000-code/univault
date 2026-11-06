import { describe, expect, it } from "vitest";

import { appRouter } from "./index";

const callReviewQueue = (role: string, emailVerified = true) => {
  const caller = appRouter.createCaller({
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
  return (
    caller.claims as unknown as { reviewQueue: () => Promise<unknown> }
  ).reviewQueue();
};

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
});
