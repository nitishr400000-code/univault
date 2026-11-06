import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { item } from "./items";

export const claimStatus = pgEnum("claim_status", [
  "Pending",
  "Approved",
  "Rejected",
]);

export const claim = pgTable(
  "claim",
  {
    claimedBy: text("claimed_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    proofNote: text("proof_note").notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    status: claimStatus("status").default("Pending").notNull(),
  },
  (table) => [
    index("claim_claimed_by_created_at_index").on(
      table.claimedBy,
      table.createdAt
    ),
    uniqueIndex("claim_pending_item_user_unique")
      .on(table.itemId, table.claimedBy)
      .where(sql`${table.status} = 'Pending'`),
  ]
);
