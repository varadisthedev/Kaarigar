import "server-only"
import { eq } from "drizzle-orm"

import { getDb } from "../client"
import { voiceSessions, type NewVoiceSession } from "../schema"

export async function createVoiceSession(input: NewVoiceSession) {
  const db = getDb()
  const [session] = await db.insert(voiceSessions).values(input).returning()
  return session
}

/** Backfills userId/businessId once an anonymous draft is claimed at OTP
 * verification, so the audit trail is complete after the fact. */
export async function attachVoiceSessionsToBusiness(draftId: string, userId: string, businessId: string) {
  const db = getDb()
  await db
    .update(voiceSessions)
    .set({ userId, businessId })
    .where(eq(voiceSessions.draftId, draftId))
}

export async function findVoiceSessionsByDraftId(draftId: string) {
  const db = getDb()
  return db.query.voiceSessions.findMany({ where: eq(voiceSessions.draftId, draftId) })
}

/** For the admin review queue — the transcript(s) behind a submission. */
export async function findVoiceSessionsByBusinessId(businessId: string) {
  const db = getDb()
  return db.query.voiceSessions.findMany({ where: eq(voiceSessions.businessId, businessId) })
}
