import "server-only"
import type { NextResponse } from "next/server"

/**
 * Short-lived cookies carrying the OAuth round-trip's state across the
 * redirect to Google/GitHub and back. SameSite=Lax (not Strict) is required
 * here specifically — the browser only sends Lax cookies on a top-level GET
 * navigation, which is exactly what the provider's redirect back to our
 * callback is; Strict would drop them and break the flow.
 */
export const OAUTH_STATE_COOKIE = "oauth_state"
export const OAUTH_NEXT_COOKIE = "oauth_next"
export const OAUTH_LOCALE_COOKIE = "oauth_locale"
export const OAUTH_NATIVE_COOKIE = "oauth_native"
const OAUTH_COOKIE_PATH = "/api/auth/oauth"
const OAUTH_COOKIE_MAX_AGE = 10 * 60 // 10 minutes — plenty for a consent screen, short if abandoned

const isProd = process.env.NODE_ENV === "production"

export function setOAuthFlowCookies(
  res: NextResponse,
  values: { state: string; next: string; locale: string; isNative?: boolean }
): void {
  const opts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  }
  res.cookies.set(OAUTH_STATE_COOKIE, values.state, opts)
  res.cookies.set(OAUTH_NEXT_COOKIE, values.next, opts)
  res.cookies.set(OAUTH_LOCALE_COOKIE, values.locale, opts)
  if (values.isNative) {
    res.cookies.set(OAUTH_NATIVE_COOKIE, "true", opts)
  }
}

export function clearOAuthFlowCookies(res: NextResponse): void {
  const opts = { path: OAUTH_COOKIE_PATH, maxAge: 0 }
  res.cookies.set(OAUTH_STATE_COOKIE, "", opts)
  res.cookies.set(OAUTH_NEXT_COOKIE, "", opts)
  res.cookies.set(OAUTH_LOCALE_COOKIE, "", opts)
  res.cookies.set(OAUTH_NATIVE_COOKIE, "", opts)
}
