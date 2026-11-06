import { randomUUID } from "node:crypto";

import "@univault/db/test/setup";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { claim } from "@univault/db/schema/claims";
import { item } from "@univault/db/schema/items";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const db = createDb({
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});

const fixture = async () => {
  const suffix = randomUUID();
  const posterId = `handover-poster-${suffix}`;
  const claimantId = `handover-claimant-${suffix}`;
  const reviewerId = `handover-reviewer-${suffix}`;
  const withoutApprovalId = randomUUID();
  const approvedItemId = randomUUID();
  await db.insert(user).values([
    {
      email: `${posterId}@college.edu`,
      emailVerified: true,
      id: posterId,
      name: "Item Poster",
    },
    {
      email: `${claimantId}@college.edu`,
      emailVerified: true,
      id: claimantId,
      name: "Claimant",
    },
    {
      email: `${reviewerId}@college.edu`,
      emailVerified: true,
      id: reviewerId,
      name: "Staff Reviewer",
      role: "staff",
    },
  ]);
  await db.insert(item).values([
    {
      category: "Other",
      description: "An item still awaiting review",
      foundAt: "2026-11-06",
      id: withoutApprovalId,
      placeFound: "Library",
      postedBy: posterId,
      status: "PendingClaim",
      title: "Pending item",
    },
    {
      category: "Other",
      description: "An item approved for handover",
      foundAt: "2026-11-06",
      id: approvedItemId,
      placeFound: "Student center",
      postedBy: posterId,
      status: "PendingClaim",
      title: "Approved item",
    },
  ]);
  await db.insert(claim).values([
    {
      claimedBy: claimantId,
      itemId: withoutApprovalId,
      proofNote: "A mark near the cap",
    },
    {
      claimedBy: claimantId,
      itemId: approvedItemId,
      proofNote: "A scratch on the bottom",
      reviewedBy: reviewerId,
      status: "Approved",
    },
  ]);
  return { approvedItemId, claimantId, reviewerId, withoutApprovalId };
};

interface HandoverCaller {
  claims: {
    handover: (input: { itemId: string }) => Promise<unknown>;
  };
  items: {
    byId: (input: { id: string }) => Promise<{ status: string }>;
    search: () => Promise<Array<{ id: string }>>;
  };
}

const staffCaller = (userId: string) =>
  appRouter.createCaller({
    auth: {} as never,
    db,
    headers: new Headers(),
    photoStorage: {} as never,
    session: {
      session: {
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        id: `session-${userId}`,
        token: `token-${userId}`,
        updatedAt: new Date(),
        userId,
      },
      user: {
        createdAt: new Date(),
        email: `${userId}@college.edu`,
        emailVerified: true,
        id: userId,
        name: "Staff Reviewer",
        role: "staff",
        updatedAt: new Date(),
      },
    } as never,
  }) as unknown as HandoverCaller;

describe("staff item handover", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("refuses to mark an item Claimed until a claim is Approved", async () => {
    const seeded = await fixture();
    const staff = staffCaller(seeded.reviewerId);

    await expect(
      staff.claims.handover({ itemId: seeded.withoutApprovalId })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      staff.items.byId({ id: seeded.withoutApprovalId })
    ).resolves.toMatchObject({ status: "PendingClaim" });
  });

  it("marks an approved item Claimed and removes it from active search", async () => {
    const seeded = await fixture();
    const staff = staffCaller(seeded.reviewerId);

    await expect(
      staff.claims.handover({ itemId: seeded.approvedItemId })
    ).resolves.toMatchObject({
      itemId: seeded.approvedItemId,
      status: "Claimed",
    });
    await expect(
      staff.items.byId({ id: seeded.approvedItemId })
    ).resolves.toMatchObject({ status: "Claimed" });
    await expect(staff.items.search()).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: seeded.approvedItemId }),
      ])
    );

    const [updated] = await db
      .select({ status: item.status })
      .from(item)
      .where(eq(item.id, seeded.approvedItemId));
    expect(updated).toEqual({ status: "Claimed" });
  });
});
