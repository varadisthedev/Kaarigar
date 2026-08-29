import type { NextRequest, NextResponse } from "next/server"

/**
 * Double-submit cookie CSRF protection for cookie-authenticated (web)
 * requests. SameSite=Lax on the session cookies already blocks the classic
 * cross-site form-POST case, but this is defense in depth against the
 * subtler case (a same-site XHR from a compromised subdomain, misconfigured
 * proxy, etc.) — and it's what "proper security measures" means concretely.
 *
 * Native clients (X-Client: native) don't rely on ambient cookies at all —
 * they send the access token as a Bearer header — so CSRF doesn't apply to
 * them; callers should skip `requireCsrf` for that path.
 *
 * Uses the Web Crypto API (not `node:crypto`) because `issueCsrfTokenIfMissing`
 * runs from `proxy.ts` on the Edge Runtime, which doesn't have `node:crypto`.
 */

export const CSRF_COOKIE = "cm_csrf"
const CSRF_HEADER = "x-csrf-token"

function randomHexToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Not cryptographically constant-time in the strict sense, but adequate
 * here: both inputs are compared in full regardless of where they first
 * differ, which is what actually matters for a token this size. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function issueCsrfTokenIfMissing(req: NextRequest, res: NextResponse): void {
  if (req.cookies.get(CSRF_COOKIE)?.value) return
  const token = randomHexToken(32)
  // Deliberately NOT httpOnly — client JS must read it to echo it back.
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
}

export function requireCsrf(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value
  const headerToken = req.headers.get(CSRF_HEADER)
  if (!cookieToken || !headerToken) return false
  return safeEqual(cookieToken, headerToken)
}
