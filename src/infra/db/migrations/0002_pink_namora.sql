CREATE TYPE "public"."media_type" AS ENUM('photo', 'video');--> statement-breakpoint
ALTER TABLE "business_media" ADD COLUMN "media_type" "media_type" DEFAULT 'photo' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "longitude" double precision;