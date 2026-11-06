CREATE TYPE "item_category" AS ENUM('Electronics', 'ID/Card', 'Keys', 'Stationery', 'Personal Gear', 'Other');--> statement-breakpoint
CREATE TYPE "item_status" AS ENUM('Active', 'PendingClaim', 'Claimed');--> statement-breakpoint
CREATE TABLE "item" (
	"category" "item_category" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"found_at" date NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"place_found" text NOT NULL,
	"posted_by" text NOT NULL,
	"status" "item_status" DEFAULT 'Active'::"item_status" NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"item_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"storage_key" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE UNIQUE INDEX "item_photo_item_position_unique" ON "item_photo" ("item_id","position");--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_posted_by_user_id_fkey" FOREIGN KEY ("posted_by") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "item_photo" ADD CONSTRAINT "item_photo_item_id_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE;