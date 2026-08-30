CREATE TABLE "product_views_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"date" date NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "advance_percent" SET DEFAULT '20';--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "monthly_income_target" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "product_views_daily" ADD CONSTRAINT "product_views_daily_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_views_daily" ADD CONSTRAINT "product_views_daily_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_views_daily_product_date_idx" ON "product_views_daily" USING btree ("product_id","date");--> statement-breakpoint
CREATE INDEX "product_views_daily_business_date_idx" ON "product_views_daily" USING btree ("business_id","date");