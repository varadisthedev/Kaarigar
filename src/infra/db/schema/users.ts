import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { userRoleEnum, userStatusEnum } from "./enums"

/**
 * OTP is the sole credential in this system — there is no password column.
 * `avatar_url`/`avatar_public_id` track the Cloudinary asset so add/replace/
 * delete can clean up the previous upload before writing the new one.
 *
 * Table files in this directory only define columns (FKs use a lazy
 * `.references(() => otherTable.col)` callback). Cross-table `relations()`
 * wiring lives in `./relations.ts` so table files never need to import each
 * other and risk a circular-import order bug.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneE164: varchar("phone_e164", { length: 20 }).notNull(),
    countryCode: varchar("country_code", { length: 6 }).notNull(),
    name: varchar("name", { length: 120 }),
    email: varchar("email", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 2048 }),
    avatarPublicId: varchar("avatar_public_id", { length: 255 }),
    locale: varchar("locale", { length: 5 }).notNull().default("en"),
    role: userRoleEnum("role").notNull().default("artisan"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_phone_e164_idx").on(table.phoneE164)]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
