import { TRPCError } from "@trpc/server";
import { user } from "@univault/db/schema/auth";
import { claim } from "@univault/db/schema/claims";
import { item as itemTable } from "@univault/db/schema/items";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { campusMemberProcedure, router, staffProcedure } from "../index";

const submitInput = z.object({
  itemId: z.uuid(),
  proofNote: z.string().trim().min(1, "Enter a proof note."),
});

export const claimsRouter = router({
  approve: staffProcedure
    .input(z.object({ claimId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [candidate] = await tx
          .select({ itemId: claim.itemId })
          .from(claim)
          .where(eq(claim.id, input.claimId))
          .limit(1);
        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Claim not found",
          });
        }

        const [lockedItem] = await tx
          .select({ status: itemTable.status })
          .from(itemTable)
          .where(eq(itemTable.id, candidate.itemId))
          .for("update");
        if (!lockedItem) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        const [target] = await tx
          .select({ claimedBy: claim.claimedBy, status: claim.status })
          .from(claim)
          .where(eq(claim.id, input.claimId))
          .limit(1);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Claim not found",
          });
        }
        if (target.status !== "Pending" || lockedItem.status === "Claimed") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This claim is no longer pending.",
          });
        }
        if (target.claimedBy === ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot review your own claim.",
          });
        }

        const [existingApproval] = await tx
          .select({ id: claim.id })
          .from(claim)
          .where(
            and(
              eq(claim.itemId, candidate.itemId),
              eq(claim.status, "Approved")
            )
          )
          .limit(1);
        if (existingApproval) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This item already has an approved claim.",
          });
        }

        const [approved] = await tx
          .update(claim)
          .set({ reviewedBy: ctx.session.user.id, status: "Approved" })
          .where(and(eq(claim.id, input.claimId), eq(claim.status, "Pending")))
          .returning({ id: claim.id, status: claim.status });
        if (!approved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This claim is no longer pending.",
          });
        }

        await tx
          .update(claim)
          .set({ reviewedBy: ctx.session.user.id, status: "Rejected" })
          .where(
            and(
              eq(claim.itemId, candidate.itemId),
              ne(claim.id, input.claimId),
              eq(claim.status, "Pending")
            )
          );
        await tx
          .update(itemTable)
          .set({ status: "PendingClaim" })
          .where(eq(itemTable.id, candidate.itemId));

        return { claimId: approved.id, status: approved.status };
      })
    ),

  myClaims: campusMemberProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        createdAt: claim.createdAt,
        id: claim.id,
        itemId: claim.itemId,
        itemTitle: itemTable.title,
        proofNote: claim.proofNote,
        status: claim.status,
      })
      .from(claim)
      .innerJoin(itemTable, eq(claim.itemId, itemTable.id))
      .where(eq(claim.claimedBy, ctx.session.user.id))
      .orderBy(desc(claim.createdAt), desc(claim.id))
  ),

  reject: staffProcedure
    .input(z.object({ claimId: z.uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [candidate] = await tx
          .select({ itemId: claim.itemId })
          .from(claim)
          .where(eq(claim.id, input.claimId))
          .limit(1);
        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Claim not found",
          });
        }

        const [lockedItem] = await tx
          .select({ status: itemTable.status })
          .from(itemTable)
          .where(eq(itemTable.id, candidate.itemId))
          .for("update");
        if (!lockedItem) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        const [target] = await tx
          .select({ claimedBy: claim.claimedBy, status: claim.status })
          .from(claim)
          .where(eq(claim.id, input.claimId))
          .limit(1);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Claim not found",
          });
        }
        if (target.status !== "Pending" || lockedItem.status === "Claimed") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This claim is no longer pending.",
          });
        }
        if (target.claimedBy === ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot review your own claim.",
          });
        }

        const [rejected] = await tx
          .update(claim)
          .set({ reviewedBy: ctx.session.user.id, status: "Rejected" })
          .where(and(eq(claim.id, input.claimId), eq(claim.status, "Pending")))
          .returning({ id: claim.id, status: claim.status });
        if (!rejected) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This claim is no longer pending.",
          });
        }

        const [remaining] = await tx
          .select({ id: claim.id })
          .from(claim)
          .where(
            and(eq(claim.itemId, candidate.itemId), eq(claim.status, "Pending"))
          )
          .limit(1);
        if (!remaining) {
          await tx
            .update(itemTable)
            .set({ status: "Active" })
            .where(eq(itemTable.id, candidate.itemId));
        }

        return { claimId: rejected.id, status: rejected.status };
      })
    ),

  reviewQueue: staffProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        claimId: claim.id,
        claimantEmail: user.email,
        claimantName: user.name,
        createdAt: claim.createdAt,
        itemId: itemTable.id,
        itemTitle: itemTable.title,
        proofNote: claim.proofNote,
      })
      .from(claim)
      .innerJoin(itemTable, eq(claim.itemId, itemTable.id))
      .innerJoin(user, eq(claim.claimedBy, user.id))
      .where(eq(claim.status, "Pending"))
      .orderBy(desc(claim.createdAt), desc(claim.id))
  ),

  submit: campusMemberProcedure.input(submitInput).mutation(({ ctx, input }) =>
    ctx.db.transaction(async (tx) => {
      const [foundItem] = await tx
        .select({
          postedBy: itemTable.postedBy,
          status: itemTable.status,
        })
        .from(itemTable)
        .where(eq(itemTable.id, input.itemId))
        .for("update");

      if (!foundItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }
      if (foundItem.postedBy === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot claim an item you posted.",
        });
      }
      if (foundItem.status === "Claimed") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This item has already been claimed.",
        });
      }

      const [existingClaim] = await tx
        .select({ id: claim.id })
        .from(claim)
        .where(
          and(
            eq(claim.itemId, input.itemId),
            eq(claim.claimedBy, ctx.session.user.id),
            eq(claim.status, "Pending")
          )
        )
        .limit(1);
      if (existingClaim) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a pending claim for this item.",
        });
      }

      const [created] = await tx
        .insert(claim)
        .values({
          claimedBy: ctx.session.user.id,
          itemId: input.itemId,
          proofNote: input.proofNote,
        })
        .returning({ id: claim.id, status: claim.status });
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The claim could not be created.",
        });
      }

      if (foundItem.status === "Active") {
        await tx
          .update(itemTable)
          .set({ status: "PendingClaim" })
          .where(
            and(eq(itemTable.id, input.itemId), eq(itemTable.status, "Active"))
          );
      }

      return created;
    })
  ),
});
