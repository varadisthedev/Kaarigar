import "server-only"
import { cookies } from "next/headers"

import { verifyAccessToken, type AccessTokenPayload } from "@/core/auth/jwt"
import { ACCESS_COOKIE } from "./auth-cookies"

/** For Server Components / layouts / server actions — reads the httpOnly
 * cookie via next/headers rather than a NextRequest. Returns null rather
 * than throwing when there's no valid session; callers decide whether that
 * means "render logged-out" or "redirect". */
export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const store = await cookies()
  const token = store.get(ACCESS_COOKIE)?.value
  if (!token) return null
  return verifyAccessToken(token)
}

/** `/admin` pages are gated by role in `proxy.ts`, but that middleware never
 * runs for `/api/*` routes — every admin API route must check this itself. */
export async function requireAdmin(): Promise<AccessTokenPayload | null> {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}
