import "server-only"
import { and, eq, isNull } from "drizzle-orm"

import { getDb } from "../client"
import { sessions, type NewSession } from "../schema"

export async function createSession(input: NewSession) {
  const db = getDb()
  const [session] = await db.insert(sessions).values(input).returning()
  return session
}

export async function findActiveSessionByHash(refreshTokenHash: string) {
  const db = getDb()
  return db.query.sessions.findFirst({
    where: and(eq(sessions.refreshTokenHash, refreshTokenHash), isNull(sessions.revokedAt)),
  })
}

/** Includes revoked sessions — needed to detect refresh-token reuse (a
 * revoked-but-matching hash means a rotated-away token was replayed). */
export async function findSessionByHashAny(refreshTokenHash: string) {
  const db = getDb()
  return db.query.sessions.findFirst({
    where: eq(sessions.refreshTokenHash, refreshTokenHash),
  })
}

export async function revokeSession(id: string) {
  const db = getDb()
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id))
}

/** Revoke every session descended from one login. Called when a refresh
 * token is reused after already being rotated — the standard signal that
 * a token was stolen, so the whole family is burned rather than just the
 * one session. */
export async function revokeSessionFamily(familyId: string) {
  const db = getDb()
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)))
}
