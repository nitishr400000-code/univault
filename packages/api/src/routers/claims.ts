import { TRPCError } from "@trpc/server";
import { claim } from "@univault/db/schema/claims";
import { item as itemTable } from "@univault/db/schema/items";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { campusMemberProcedure, router } from "../index";

const submitInput = z.object({
  itemId: z.uuid(),
  proofNote: z.string().trim().min(1, "Enter a proof note."),
});

export const claimsRouter = router({
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
