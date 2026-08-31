import { pgTable, uuid, varchar, integer, timestamp, text } from "drizzle-orm/pg-core"

import { otpPurposeEnum } from "./enums"
import { users } from "./users"

/**
 * `code_hash` is argon2id — never store or log the plaintext code.
 * Rate limiting (IP + phone) lives in `infra/ratelimit`, not here.
 */
export const otpChallenges = pgTable("otp_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneE164: varchar("phone_e164", { length: 20 }).notNull(),
  purpose: otpPurposeEnum("purpose").notNull().default("login"),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Refresh tokens are stored only as a SHA-256 digest. `familyId` groups every
 * token descended from one login so that reuse of an already-rotated token
 * (a signal of theft) revokes the whole family, not just one session.
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  familyId: uuid("family_id").notNull(),
  userAgent: text("user_agent"),
  ip: varchar("ip", { length: 64 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type OtpChallenge = typeof otpChallenges.$inferSelect
export type NewOtpChallenge = typeof otpChallenges.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
