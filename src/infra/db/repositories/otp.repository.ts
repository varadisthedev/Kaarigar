import "server-only"
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm"

import { getDb } from "../client"
import { otpChallenges, type NewOtpChallenge } from "../schema"

export async function createOtpChallenge(input: NewOtpChallenge) {
  const db = getDb()
  const [challenge] = await db.insert(otpChallenges).values(input).returning()
  return challenge
}

/** The most recent still-usable challenge for this phone/purpose — not yet
 * consumed and not yet expired. */
export async function findActiveOtpChallenge(
  phoneE164: string,
  purpose: NewOtpChallenge["purpose"]
) {
  const db = getDb()
  return db.query.otpChallenges.findFirst({
    where: and(
      eq(otpChallenges.phoneE164, phoneE164),
      purpose ? eq(otpChallenges.purpose, purpose) : undefined,
      isNull(otpChallenges.consumedAt),
      gt(otpChallenges.expiresAt, new Date())
    ),
    orderBy: desc(otpChallenges.createdAt),
  })
}

/** Atomic — no read-then-write race between concurrent verify attempts. */
export async function incrementOtpAttempts(id: string) {
  const db = getDb()
  const [challenge] = await db
    .update(otpChallenges)
    .set({ attempts: sql`${otpChallenges.attempts} + 1` })
    .where(eq(otpChallenges.id, id))
    .returning()
  return challenge
}

export async function consumeOtpChallenge(id: string) {
  const db = getDb()
  const [challenge] = await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, id))
    .returning()
  return challenge
}

/** Count challenges created for a phone/IP within a window — used by the
 * rate limiter. Kept here rather than in infra/ratelimit so that module stays
 * generic (not otp-table-specific). */
export async function countRecentOtpChallenges(phoneE164: string, sinceMs: number) {
  const db = getDb()
  const rows = await db.query.otpChallenges.findMany({
    where: and(eq(otpChallenges.phoneE164, phoneE164), gt(otpChallenges.createdAt, new Date(sinceMs))),
  })
  return rows.length
}

export async function countRecentOtpChallengesByIp(ip: string, sinceMs: number) {
  const db = getDb()
  const rows = await db.query.otpChallenges.findMany({
    where: and(eq(otpChallenges.ip, ip), gt(otpChallenges.createdAt, new Date(sinceMs))),
  })
  return rows.length
}
