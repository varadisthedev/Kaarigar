import "server-only"
import { cookies, headers } from "next/headers"

import { verifyAccessToken, type AccessTokenPayload } from "@/core/auth/jwt"
import { ACCESS_COOKIE } from "./auth-cookies"

/** For Server Components / layouts / server actions / route handlers —
 * reads the session via next/headers rather than a NextRequest. Native
 * (Expo) clients send `X-Client: native` and an `Authorization: Bearer`
 * token instead of a cookie (see infra/http/auth-cookies.ts); everyone
 * else uses the httpOnly cookie. Returns null rather than throwing when
 * there's no valid session; callers decide whether that means
 * "render logged-out" or "redirect". */
export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const hdrs = await headers()
  const token =
    hdrs.get("x-client") === "native"
      ? (hdrs.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null)
      : ((await cookies()).get(ACCESS_COOKIE)?.value ?? null)
  if (!token) return null
  return verifyAccessToken(token)
}

/** `/admin` pages are gated by role in `proxy.ts`, but that middleware never
 * runs for `/api/*` routes — every admin API route must check this itself. */
export async function requireAdmin(): Promise<AccessTokenPayload | null> {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}
