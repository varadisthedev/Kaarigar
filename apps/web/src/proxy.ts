import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { routing } from "@/i18n/routing"
import { verifyAccessToken } from "@/core/auth/jwt"
import { issueCsrfTokenIfMissing } from "@/infra/http/csrf"
import { ACCESS_COOKIE } from "@/infra/http/auth-cookies"

const intlMiddleware = createMiddleware(routing)

// Route prefixes that require auth, stripped of their locale segment.
// Kept intentionally short: real per-business ownership checks still happen
// server-side in the page/route handler — this is just the login gate.
const PROTECTED_PREFIXES: { prefix: string; role?: "admin" }[] = [
  { prefix: "/account" },
  { prefix: "/sell" },
  { prefix: "/inquiries" },
  { prefix: "/admin", role: "admin" },
]

function stripLocale(pathname: string): string {
  const segments = pathname.split("/")
  return routing.locales.includes(segments[1] as (typeof routing.locales)[number])
    ? "/" + segments.slice(2).join("/")
    : pathname
}

function localeFromPath(pathname: string): string {
  const segments = pathname.split("/")
  return routing.locales.includes(segments[1] as (typeof routing.locales)[number])
    ? segments[1]
    : routing.defaultLocale
}

export default async function proxy(req: NextRequest) {
  const response = await intlMiddleware(req)

  const pathname = req.nextUrl.pathname
  const unlocalized = stripLocale(pathname)
  const match = PROTECTED_PREFIXES.find((p) => unlocalized.startsWith(p.prefix))

  if (match) {
    const token = req.cookies.get(ACCESS_COOKIE)?.value
    const payload = token ? await verifyAccessToken(token) : null

    if (!payload || (match.role && payload.role !== match.role)) {
      const locale = localeFromPath(pathname)
      const loginUrl = new URL(`/${locale}/login`, req.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  issueCsrfTokenIfMissing(req, response)
  return response
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
