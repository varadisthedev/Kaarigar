ALTER TABLE "users" ADD COLUMN "state" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "district" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shopping_interest" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_completed_at" timestamp with time zone;