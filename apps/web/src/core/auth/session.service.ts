import "server-only"

import { signAccessToken, verifyAccessToken, REFRESH_TOKEN_TTL_SECONDS } from "./jwt"
import {
  generateRefreshToken,
  hashRefreshToken,
  newSessionFamilyId,
} from "./refresh-token"
import {
  createSession,
  findSessionByHashAny,
  revokeSession,
  revokeSessionFamily,
} from "@/infra/db/repositories/sessions.repository"
import { findUserById } from "@/infra/db/repositories/users.repository"
import type { User } from "@/infra/db/schema"

export type IssuedTokens = {
  accessToken: string
  refreshToken: string
  refreshExpiresAt: Date
}

function accessPayloadFor(user: User) {
  return { sub: user.id, phone: user.phoneE164, role: user.role }
}

/** A brand-new login: starts a new session family. */
export async function issueSession(
  user: User,
  meta: { userAgent: string | null; ip: string | null }
): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
  const familyId = newSessionFamilyId()

  await createSession({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    familyId,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: refreshExpiresAt,
  })

  const accessToken = await signAccessToken(accessPayloadFor(user))
  return { accessToken, refreshToken, refreshExpiresAt }
}

export type RotateResult =
  | ({ ok: true } & IssuedTokens)
  | { ok: false; error: "invalid" | "expired" | "reuse_detected" }

/**
 * Rotation with reuse detection: the presented token must match a still-
 * active session. If it matches one that's already revoked, that's a replay
 * of a token that was already rotated away — the whole family is revoked
 * rather than just failing this one request, since that pattern means the
 * refresh token was stolen and both the attacker and the legitimate client
 * are racing to use it.
 */
export async function rotateSession(
  presentedRefreshToken: string,
  meta: { userAgent: string | null; ip: string | null }
): Promise<RotateResult> {
  const hash = hashRefreshToken(presentedRefreshToken)
  const session = await findSessionByHashAny(hash)

  if (!session) return { ok: false, error: "invalid" }

  if (session.revokedAt) {
    await revokeSessionFamily(session.familyId)
    return { ok: false, error: "reuse_detected" }
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await revokeSession(session.id)
    return { ok: false, error: "expired" }
  }

  const user = await findUserById(session.userId)
  if (!user) return { ok: false, error: "invalid" }

  await revokeSession(session.id)

  const refreshToken = generateRefreshToken()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)

  await createSession({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    familyId: session.familyId, // same family — this is a rotation, not a new login
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: refreshExpiresAt,
  })

  const accessToken = await signAccessToken(accessPayloadFor(user))
  return { ok: true, accessToken, refreshToken, refreshExpiresAt }
}

export async function logout(presentedRefreshToken: string): Promise<void> {
  const hash = hashRefreshToken(presentedRefreshToken)
  const session = await findSessionByHashAny(hash)
  if (session && !session.revokedAt) {
    await revokeSession(session.id)
  }
}

export { verifyAccessToken }
