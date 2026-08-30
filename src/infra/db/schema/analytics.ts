import { pgTable, uuid, integer, date, uniqueIndex, index } from "drizzle-orm/pg-core"

import { businesses } from "./business"
import { products } from "./catalog"

/** One row per (product, day) — a daily upsert counter rather than raw view
 * events, so the Analytics line chart's per-day totals and per-product
 * breakdown are both cheap reads without a rollup job. */
export const productViewsDaily = pgTable(
  "product_views_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("product_views_daily_product_date_idx").on(table.productId, table.date),
    index("product_views_daily_business_date_idx").on(table.businessId, table.date),
  ]
)

export type ProductViewsDaily = typeof productViewsDaily.$inferSelect
export type NewProductViewsDaily = typeof productViewsDaily.$inferInsert
