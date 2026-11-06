import { randomUUID } from "node:crypto";

import "@univault/db/test/setup";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { item } from "@univault/db/schema/items";
import { claim } from "@univault/db/schema/claims";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const db = createDb({
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});

const fixture = async (status: "Active" | "PendingClaim" | "Claimed" = "Active") => {
  const suffix = randomUUID();
  const posterId = `poster-${suffix}`;
  const claimantId = `claimant-${suffix}`;
  const otherClaimantId = `other-claimant-${suffix}`;
  const itemId = randomUUID();
  await db.insert(user).values([
    { email: `${posterId}@college.edu`, emailVerified: true, id: posterId, name: "Item Poster" },
    { email: `${claimantId}@college.edu`, emailVerified: true, id: claimantId, name: "Item Owner" },
    { email: `${otherClaimantId}@college.edu`, emailVerified: true, id: otherClaimantId, name: "Another Owner" },
  ]);
  await db.insert(item).values({
    category: "Other",
    description: "A silver water bottle with a star sticker",
    foundAt: "2026-10-01",
    id: itemId,
    placeFound: "Science building",
    postedBy: posterId,
    status,
    title: "Water bottle",
  });
  return { claimantId, itemId, otherClaimantId, posterId };
};

const callerFor = (userId: string) =>
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
        name: "Campus User",
        role: "student",
        updatedAt: new Date(),
      },
    } as never,
  });

describe("claim submission", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("refuses a user from claiming their own post", async () => {
    const seeded = await fixture();
    await expect(
      callerFor(seeded.posterId).claims.submit({
        itemId: seeded.itemId,
        proofNote: "A scratch on the cap",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      callerFor(seeded.posterId).items.byId({ id: seeded.itemId })
    ).resolves.toMatchObject({ status: "Active" });
  });

  it("moves an active item to pending and allows another claimant", async () => {
    const seeded = await fixture();
    const claimant = callerFor(seeded.claimantId);
    const otherClaimant = callerFor(seeded.otherClaimantId);
    await expect(
      claimant.claims.submit({
        itemId: seeded.itemId,
        proofNote: "A small dent near the bottom",
      })
    ).resolves.toMatchObject({ status: "Pending" });
    await expect(
      claimant.items.byId({ id: seeded.itemId })
    ).resolves.toMatchObject({ status: "PendingClaim" });
    await expect(
      otherClaimant.claims.submit({
        itemId: seeded.itemId,
        proofNote: "The sticker is partly peeled off on the side",
      })
    ).resolves.toMatchObject({ status: "Pending" });
    await expect(
      claimant.items.byId({ id: seeded.itemId })
    ).resolves.toMatchObject({ status: "PendingClaim" });
  });

  it("refuses a second pending claim from the same user and item", async () => {
    const seeded = await fixture();
    const claimant = callerFor(seeded.claimantId);
    const input = { itemId: seeded.itemId, proofNote: "A small dent near the bottom" };
    await claimant.claims.submit(input);
    await expect(claimant.claims.submit(input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refuses claims on an item already marked claimed", async () => {
    const seeded = await fixture("Claimed");
    await expect(
      callerFor(seeded.claimantId).claims.submit({
        itemId: seeded.itemId,
        proofNote: "A small dent near the bottom",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("serializes concurrent pending claims for one user and item", async () => {
    const seeded = await fixture();
    const claimant = callerFor(seeded.claimantId);
    const input = { itemId: seeded.itemId, proofNote: "A small dent near the bottom" };
    const attempts = await Promise.allSettled([
      claimant.claims.submit(input),
      claimant.claims.submit(input),
    ]);
    expect(attempts.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === "rejected")).toHaveLength(1);
  });

  it("lists claims with their statuses without exposing claimant email", async () => {
    const seeded = await fixture();
    const created = await callerFor(seeded.claimantId).claims.submit({
      itemId: seeded.itemId,
      proofNote: "A small dent near the bottom",
    });
    const myClaims = await callerFor(seeded.claimantId).claims.myClaims();
    expect(myClaims).toEqual([
      expect.objectContaining({
        id: created.id,
        itemId: seeded.itemId,
        itemTitle: "Water bottle",
        proofNote: "A small dent near the bottom",
        status: "Pending",
      }),
    ]);
    expect(JSON.stringify(myClaims)).not.toContain(`${seeded.claimantId}@college.edu`);
  });

  it("shows approved and rejected statuses in My claims", async () => {
    const seeded = await fixture();
    const secondItemId = randomUUID();
    const thirdItemId = randomUUID();
    await db.insert(item).values([
      {
        category: "Other",
        description: "A second item",
        foundAt: "2026-10-02",
        id: secondItemId,
        placeFound: "Library",
        postedBy: seeded.posterId,
        status: "PendingClaim",
        title: "Second item",
      },
      {
        category: "Other",
        description: "A third item",
        foundAt: "2026-10-03",
        id: thirdItemId,
        placeFound: "Library",
        postedBy: seeded.posterId,
        title: "Third item",
      },
    ]);
    await db.insert(claim).values([
      {
        claimedBy: seeded.claimantId,
        itemId: secondItemId,
        proofNote: "A mark on the handle",
        status: "Approved",
      },
      {
        claimedBy: seeded.claimantId,
        itemId: thirdItemId,
        proofNote: "My initials are on the bottom",
        status: "Rejected",
      },
    ]);
    const myClaims = await callerFor(seeded.claimantId).claims.myClaims();
    expect(myClaims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemTitle: "Second item", status: "Approved" }),
        expect.objectContaining({ itemTitle: "Third item", status: "Rejected" }),
      ])
    );
  });
});
