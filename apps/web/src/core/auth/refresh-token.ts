import { randomBytes, randomUUID, createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/config/env"

/**
 * Opaque bearer tokens (not JWTs) — 256 bits of randomness, given to the
 * client once and never stored in plaintext. What's persisted in `sessions`
 * is an HMAC-SHA256 digest keyed by JWT_REFRESH_SECRET, so a leaked database
 * row alone doesn't let anyone compute a valid token or look one up across
 * a different deployment's secret.
 */

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashRefreshToken(token: string): string {
  return createHmac("sha256", env.JWT_REFRESH_SECRET).update(token).digest("hex")
}

export function refreshTokensEqual(hashA: string, hashB: string): boolean {
  const a = Buffer.from(hashA, "hex")
  const b = Buffer.from(hashB, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

export function newSessionFamilyId(): string {
  return randomUUID()
}
