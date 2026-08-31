import { pgTable, uuid, varchar, numeric, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"

import { pricingEngineEnum } from "./enums"
import { products } from "./catalog"

/**
 * Seed data the deterministic rules engine scores against — category x
 * material x size band x region -> a defensible price band. This is what
 * keeps pricing suggestions available and explainable with zero API keys.
 */
export const priceReference = pgTable("price_reference", {
  id: uuid("id").primaryKey().defaultRandom(),
  craftCategory: varchar("craft_category", { length: 80 }).notNull(),
  material: varchar("material", { length: 80 }),
  sizeBand: varchar("size_band", { length: 30 }).notNull().default("medium"),
  region: varchar("region", { length: 80 }),
  priceMin: numeric("price_min", { precision: 10, scale: 2 }).notNull(),
  priceMax: numeric("price_max", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Every suggestion shown to an artisan is persisted with the engine that
 * produced it (ml_service -> rules_engine -> gemini, in fallback order) plus
 * a human-readable rationale, so "why this price" is always answerable.
 */
export const priceSuggestions = pgTable(
  "price_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    engine: pricingEngineEnum("engine").notNull(),
    suggestedMin: numeric("suggested_min", { precision: 10, scale: 2 }).notNull(),
    suggestedMax: numeric("suggested_max", { precision: 10, scale: 2 }).notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    rationaleEn: text("rationale_en"),
    rationaleHi: text("rationale_hi"),
    inputs: jsonb("inputs"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("price_suggestions_product_id_idx").on(table.productId)]
)

export type PriceReference = typeof priceReference.$inferSelect
export type NewPriceReference = typeof priceReference.$inferInsert
export type PriceSuggestion = typeof priceSuggestions.$inferSelect
export type NewPriceSuggestion = typeof priceSuggestions.$inferInsert
