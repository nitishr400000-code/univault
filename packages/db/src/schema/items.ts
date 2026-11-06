import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const itemCategory = pgEnum("item_category", [
  "Electronics",
  "ID/Card",
  "Keys",
  "Stationery",
  "Personal Gear",
  "Other",
]);

export const itemStatus = pgEnum("item_status", [
  "Active",
  "PendingClaim",
  "Claimed",
]);

export const item = pgTable("item", {
  category: itemCategory("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  description: text("description").notNull(),
  foundAt: date("found_at", { mode: "string" }).notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  placeFound: text("place_found").notNull(),
  postedBy: text("posted_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  status: itemStatus("status").default("Active").notNull(),
  title: text("title").notNull(),
});

export const itemPhoto = pgTable(
  "item_photo",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    storageKey: text("storage_key").notNull().unique(),
  },
  (table) => [
    uniqueIndex("item_photo_item_position_unique").on(
      table.itemId,
      table.position
    ),
  ]
);
