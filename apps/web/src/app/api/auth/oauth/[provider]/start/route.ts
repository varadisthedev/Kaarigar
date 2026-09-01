import { randomBytes } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"

import { getOAuthProvider } from "@/infra/oauth"
import { setOAuthFlowCookies } from "@/infra/http/oauth-cookies"
import { sanitizeRedirectPath } from "@/core/auth/redirect-safety"
import { routing } from "@/i18n/routing"

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const provider = getOAuthProvider(providerName)

  const localeParam = req.nextUrl.searchParams.get("locale")
  const isNative = req.nextUrl.searchParams.get("native") === "true"
  const locale = routing.locales.includes(localeParam as (typeof routing.locales)[number])
    ? localeParam!
    : routing.defaultLocale

  if (!provider) {
    const url = new URL(`/${locale}/login`, req.nextUrl.origin)
    url.searchParams.set("oauthError", "not_configured")
    return NextResponse.redirect(url)
  }

  const next = sanitizeRedirectPath(req.nextUrl.searchParams.get("next"), `/${locale}`)
  const state = randomBytes(32).toString("hex")
  const redirectUri = `${req.nextUrl.origin}/api/auth/oauth/${providerName}/callback`

  const res = NextResponse.redirect(provider.buildAuthUrl({ state, redirectUri }))
  setOAuthFlowCookies(res, { state, next, locale, isNative })
  return res
}
