ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(60);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" varchar(20);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "shopping_interest" TYPE varchar(500);
