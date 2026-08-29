import { SignJWT, jwtVerify } from "jose"

import { env } from "@/config/env"

/**
 * Access tokens are short-lived signed JWTs (HS256, via `jose` — edge-safe,
 * so `proxy.ts` can verify them without a Node runtime). Refresh tokens are
 * NOT JWTs: they're opaque random strings, stored only as a SHA-256 hash in
 * `sessions` (see `refresh-token.ts`), so nothing about them is verifiable
 * without the database — which is the point, since revocation has to work.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

export type AccessTokenPayload = {
  sub: string // user id
  phone: string
  role: "artisan" | "buyer" | "admin"
}

function accessSecret() {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET)
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret())
}

/** Never throws — returns null on any invalid/expired/malformed token, since
 * callers (middleware, route handlers) always just want "is this valid". */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret())
    if (typeof payload.sub !== "string" || typeof payload.phone !== "string") return null
    if (payload.role !== "artisan" && payload.role !== "buyer" && payload.role !== "admin") {
      return null
    }
    return { sub: payload.sub, phone: payload.phone, role: payload.role }
  } catch {
    return null
  }
}
