import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core"

import { kycProviderEnum } from "./enums"
import { users } from "./users"

/**
 * Schema placeholder only — NEVER written to in the MVP.
 *
 * Per SIH scope: Aadhaar verification is an optional future module, not part
 * of the hackathon build. Raw Aadhaar numbers are never stored here or
 * anywhere else in this codebase — doing so is restricted under the Aadhaar
 * Act §29 and requires being a licensed AUA/KUA. The designed extension point
 * is DigiLocker OAuth or Offline Aadhaar XML/QR, which return only a verified
 * name/DOB/address and a share-code-derived last 4 digits — never the number
 * itself — plus a verification receipt. The masked "XXXX XXXX 1234" UI reads
 * from `last4` only, never from a decrypted full number, because no full
 * number is ever persisted.
 */
export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: kycProviderEnum("provider").notNull(),
  verifiedName: varchar("verified_name", { length: 160 }),
  verifiedDob: varchar("verified_dob", { length: 10 }),
  last4: varchar("last4", { length: 4 }),
  verificationReceipt: jsonb("verification_receipt"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type KycDocument = typeof kycDocuments.$inferSelect
export type NewKycDocument = typeof kycDocuments.$inferInsert
