CREATE TYPE "claim_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TABLE "claim" (
	"claimed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"item_id" uuid NOT NULL,
	"proof_note" text NOT NULL,
	"reviewed_by" text,
	"status" "claim_status" DEFAULT 'Pending'::"claim_status" NOT NULL
);
--> statement-breakpoint
CREATE INDEX "claim_claimed_by_created_at_index" ON "claim" ("claimed_by","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_pending_item_user_unique" ON "claim" ("item_id","claimed_by") WHERE "status" = 'Pending';--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_item_id_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL;