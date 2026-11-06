import { randomUUID } from "node:crypto";

import "@univault/db/test/setup";
import { createDb } from "@univault/db";
import { user } from "@univault/db/schema/auth";
import { claim } from "@univault/db/schema/claims";
import { item } from "@univault/db/schema/items";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const db = createDb({
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:password@localhost:5433/univault_test",
});

const fixture = async (includeStaffClaim = false) => {
  const suffix = randomUUID();
  const posterId = "review-poster-" + suffix;
  const staffId = "review-staff-" + suffix;
  const claimantIds = [
    "review-claimant-a-" + suffix,
    "review-claimant-b-" + suffix,
  ];
  if (includeStaffClaim) {
    claimantIds.push(staffId);
  }
  const itemId = randomUUID();
  const people = [
    { email: posterId + "@college.edu", id: posterId, name: "Item Poster" },
    {
      email: staffId + "@college.edu",
      id: staffId,
      name: "Staff Reviewer",
      role: "staff",
    },
    ...claimantIds
      .filter((id) => id !== staffId)
      .map((id) => ({
        email: id + "@college.edu",
        id,
        name: "Campus Claimant",
      })),
  ];
  await db.insert(user).values(
    people.map((person) => ({ emailVerified: true, ...person }))
  );
  await db.insert(item).values({
    category: "Other",
    description: "A red umbrella with a wooden handle",
    foundAt: "2026-10-05",
    id: itemId,
    placeFound: "Student center",
    postedBy: posterId,
    status: "PendingClaim",
    title: "Red umbrella",
  });
  const insertedClaims = await db
    .insert(claim)
    .values(
      claimantIds.map((claimedBy) => ({
        claimedBy,
        itemId,
        proofNote: "Proof note from " + claimedBy,
        status: "Pending" as const,
      }))
    )
    .returning({ claimedBy: claim.claimedBy, id: claim.id });
  return { itemId, insertedClaims, posterId, staffId };
};

const callerFor = (userId: string, role: "student" | "staff" = "staff") =>
  appRouter.createCaller({
    auth: {} as never,
    db,
    headers: new Headers(),
    photoStorage: {} as never,
    session: {
      session: {
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        id: "session-" + userId,
        token: "token-" + userId,
        updatedAt: new Date(),
        userId,
      },
      user: {
        createdAt: new Date(),
        email: userId + "@college.edu",
        emailVerified: true,
        id: userId,
        name: "Review User",
        role,
        updatedAt: new Date(),
      },
    } as never,
  });

describe("staff claim review", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("lists pending claims with item, claimant email, and proof note", async () => {
    const seeded = await fixture();
    const queue = await callerFor(seeded.staffId).claims.reviewQueue();
    expect(queue).toEqual(
      expect.arrayContaining(
        seeded.insertedClaims.map((pending) =>
          expect.objectContaining({
            claimId: pending.id,
            claimantEmail: pending.claimedBy + "@college.edu",
            itemId: seeded.itemId,
            itemTitle: "Red umbrella",
            proofNote: "Proof note from " + pending.claimedBy,
          })
        )
      )
    );
  });

  it("approves one claim, rejects competing claims, records the reviewer, and leaves the item pending", async () => {
    const seeded = await fixture();
    const [approved, rejected] = seeded.insertedClaims;
    if (!(approved && rejected)) {
      throw new Error("The review fixture needs two claims.");
    }
    await callerFor(seeded.staffId).claims.approve({ claimId: approved.id });

    await expect(
      callerFor(approved.claimedBy, "student").claims.myClaims()
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "Approved" })])
    );
    await expect(
      callerFor(rejected.claimedBy, "student").claims.myClaims()
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "Rejected" })])
    );
    await expect(
      callerFor(seeded.posterId, "student").items.byId({ id: seeded.itemId })
    ).resolves.toMatchObject({ status: "PendingClaim" });

    const updated = await db
      .select({ id: claim.id, reviewedBy: claim.reviewedBy })
      .from(claim)
      .where(inArray(claim.id, [approved.id, rejected.id]));
    expect(updated).toEqual([
      { id: approved.id, reviewedBy: seeded.staffId },
      { id: rejected.id, reviewedBy: seeded.staffId },
    ]);
  });

  it("allows at most one concurrent approval per item", async () => {
    const seeded = await fixture();
    const [first, second] = seeded.insertedClaims;
    if (!(first && second)) {
      throw new Error("The review fixture needs two claims.");
    }
    const reviewer = callerFor(seeded.staffId);
    const outcomes = await Promise.allSettled([
      reviewer.claims.approve({ claimId: first.id }),
      reviewer.claims.approve({ claimId: second.id }),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected")
    ).toHaveLength(1);
    const claims = await db
      .select({ status: claim.status })
      .from(claim)
      .where(inArray(claim.id, [first.id, second.id]));
    expect(claims.filter(({ status }) => status === "Approved")).toHaveLength(1);
  });

  it("returns an item to Active only after the last pending claim is rejected", async () => {
    const seeded = await fixture();
    const [first, second] = seeded.insertedClaims;
    if (!(first && second)) {
      throw new Error("The review fixture needs two claims.");
    }
    const reviewer = callerFor(seeded.staffId);
    await reviewer.claims.reject({ claimId: first.id });
    await expect(
      callerFor(seeded.posterId, "student").items.byId({ id: seeded.itemId })
    ).resolves.toMatchObject({ status: "PendingClaim" });
    await reviewer.claims.reject({ claimId: second.id });
    await expect(
      callerFor(seeded.posterId, "student").items.byId({ id: seeded.itemId })
    ).resolves.toMatchObject({ status: "Active" });
    await expect(
      callerFor(second.claimedBy, "student").claims.myClaims()
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "Rejected" })])
    );
  });

  it("refuses staff from approving or rejecting their own claim", async () => {
    const seeded = await fixture(true);
    const ownClaim = seeded.insertedClaims.find(
      ({ claimedBy }) => claimedBy === seeded.staffId
    );
    if (!ownClaim) {
      throw new Error("The review fixture needs a claim from the reviewer.");
    }
    const reviewer = callerFor(seeded.staffId);
    await expect(
      reviewer.claims.approve({ claimId: ownClaim.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      reviewer.claims.reject({ claimId: ownClaim.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
