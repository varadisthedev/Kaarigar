import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core"

import { voicePurposeEnum, speechProviderEnum } from "./enums"
import { users } from "./users"
import { businesses } from "./business"

/**
 * Audit trail of every mic capture — proves the NLP path end-to-end and lets
 * a submission be replayed during admin review. `draftId` correlates capture
 * sessions from before the artisan has an account yet (auth happens *after*
 * the form is filled); `userId`/`businessId` are backfilled once the draft is
 * claimed on OTP verification.
 */
export const voiceSessions = pgTable(
  "voice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: varchar("draft_id", { length: 64 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
    purpose: voicePurposeEnum("purpose").notNull(),
    audioPublicId: varchar("audio_public_id", { length: 255 }),
    language: varchar("language", { length: 10 }),
    transcriptRaw: text("transcript_raw"),
    translationEn: text("translation_en"),
    provider: speechProviderEnum("provider").notNull(),
    extractedJson: jsonb("extracted_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("voice_sessions_draft_id_idx").on(table.draftId)]
)

export type VoiceSession = typeof voiceSessions.$inferSelect
export type NewVoiceSession = typeof voiceSessions.$inferInsert
