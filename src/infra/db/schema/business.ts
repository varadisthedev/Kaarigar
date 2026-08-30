import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  doublePrecision,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"

import { businessStatusEnum, mediaTypeEnum } from "./enums"
import { users } from "./users"

/**
 * `businessCode` (e.g. "CM-MH-000123") is only assigned on approval — it's
 * the artisan's public, human-readable business ID across the marketplace.
 * Everything above `status` is filled in from the voice-onboarding draft;
 * everything from `submittedAt` down belongs to the admin review workflow.
 */
export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessCode: varchar("business_code", { length: 20 }),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    legalName: varchar("legal_name", { length: 160 }),
    craftCategory: varchar("craft_category", { length: 80 }).notNull(),
    descriptionEn: text("description_en"),
    descriptionHi: text("description_hi"),
    district: varchar("district", { length: 80 }),
    state: varchar("state", { length: 80 }),
    pincode: varchar("pincode", { length: 10 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    logoUrl: varchar("logo_url", { length: 2048 }),
    logoPublicId: varchar("logo_public_id", { length: 255 }),
    coverUrl: varchar("cover_url", { length: 2048 }),
    coverPublicId: varchar("cover_public_id", { length: 255 }),
    yearsExperience: integer("years_experience"),
    monthlyCapacity: varchar("monthly_capacity", { length: 80 }),
    /** Seller-editable monthly earnings goal shown on the Analytics tab's income chart. */
    monthlyIncomeTarget: numeric("monthly_income_target", { precision: 10, scale: 2 }),
    status: businessStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("businesses_business_code_idx").on(table.businessCode),
    index("businesses_status_idx").on(table.status),
    index("businesses_owner_id_idx").on(table.ownerId),
  ]
)

export const businessMedia = pgTable(
  "business_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    enhancedUrl: varchar("enhanced_url", { length: 2048 }),
    mediaType: mediaTypeEnum("media_type").notNull().default("photo"),
    isPrimary: boolean("is_primary").notNull().default(false),
    altEn: text("alt_en"),
    altHi: text("alt_hi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("business_media_business_id_idx").on(table.businessId)]
)

export type Business = typeof businesses.$inferSelect
export type NewBusiness = typeof businesses.$inferInsert
export type BusinessMedia = typeof businessMedia.$inferSelect
export type NewBusinessMedia = typeof businessMedia.$inferInsert
