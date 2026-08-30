import { NextResponse, type NextRequest } from "next/server"

import { getOAuthProvider } from "@/infra/oauth"
import { findOrCreateUserFromOAuth } from "@/core/auth/oauth.service"
import { issueSession } from "@/core/auth/session.service"
import { sanitizeRedirectPath } from "@/core/auth/redirect-safety"
import { attachAuthCookies, clientIp } from "@/infra/http/auth-cookies"
import {
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  OAUTH_LOCALE_COOKIE,
  clearOAuthFlowCookies,
} from "@/infra/http/oauth-cookies"

function errorRedirect(origin: string, locale: string, code: string) {
  const url = new URL(`/${locale}/login`, origin)
  url.searchParams.set("oauthError", code)
  const res = NextResponse.redirect(url)
  clearOAuthFlowCookies(res)
  return res
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const locale = req.cookies.get(OAUTH_LOCALE_COOKIE)?.value ?? "en"
  const provider = getOAuthProvider(providerName)
  if (!provider) return errorRedirect(req.nextUrl.origin, locale, "not_configured")

  // The user denying consent on the provider's screen arrives here as
  // `?error=access_denied` — not a bug, just "no thanks".
  if (req.nextUrl.searchParams.get("error")) {
    return errorRedirect(req.nextUrl.origin, locale, "denied")
  }

  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value
  const next = sanitizeRedirectPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value, `/${locale}`)

  if (!code || !state || !cookieState || state !== cookieState) {
    return errorRedirect(req.nextUrl.origin, locale, "invalid_state")
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/oauth/${providerName}/callback`
    const { accessToken } = await provider.exchangeCode({ code, redirectUri })
    const profile = await provider.fetchProfile(accessToken)
    const user = await findOrCreateUserFromOAuth(provider.name, profile)

    const tokens = await issueSession(user, {
      userAgent: req.headers.get("user-agent"),
      ip: clientIp(req),
    })

    const res = NextResponse.redirect(new URL(next, req.nextUrl.origin))
    attachAuthCookies(res, tokens)
    clearOAuthFlowCookies(res)
    return res
  } catch (err) {
    console.error(`[oauth:${providerName}] callback failed:`, err)
    return errorRedirect(req.nextUrl.origin, locale, "failed")
  }
}
