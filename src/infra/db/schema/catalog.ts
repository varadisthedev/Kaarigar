import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"

import { productStatusEnum } from "./enums"
import { businesses } from "./business"

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 220 }).notNull(),
    titleEn: varchar("title_en", { length: 200 }).notNull(),
    titleHi: varchar("title_hi", { length: 200 }),
    descriptionEn: text("description_en"),
    descriptionHi: text("description_hi"),
    materials: text("materials").array(),
    dimensions: varchar("dimensions", { length: 120 }),
    weightGrams: integer("weight_grams"),
    moq: integer("moq").notNull().default(1),
    unit: varchar("unit", { length: 30 }).notNull().default("piece"),
    priceMin: numeric("price_min", { precision: 10, scale: 2 }),
    priceMax: numeric("price_max", { precision: 10, scale: 2 }),
    leadTimeDays: integer("lead_time_days"),
    seoKeywords: text("seo_keywords").array(),
    status: productStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    index("products_business_id_idx").on(table.businessId),
    index("products_status_idx").on(table.status),
  ]
)

export const productMedia = pgTable(
  "product_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    enhancedUrl: varchar("enhanced_url", { length: 2048 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    altEn: text("alt_en"),
    altHi: text("alt_hi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_media_product_id_idx").on(table.productId)]
)

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type ProductMedia = typeof productMedia.$inferSelect
export type NewProductMedia = typeof productMedia.$inferInsert
