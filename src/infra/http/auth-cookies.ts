import "server-only"
import type { NextRequest, NextResponse } from "next/server"

import { ACCESS_TOKEN_TTL_SECONDS } from "@/core/auth/jwt"
import type { IssuedTokens } from "@/core/auth/session.service"

export const ACCESS_COOKIE = "cm_at"
export const REFRESH_COOKIE = "cm_rt"

const isProd = process.env.NODE_ENV === "production"

/**
 * Web clients get httpOnly cookies. The refresh cookie is scoped to
 * /api/auth so it's never sent to routes that don't need it. Native (Expo)
 * clients send `X-Client: native` and get raw tokens in the JSON body
 * instead — see the request handlers in app/api/auth/*.
 */
export function attachAuthCookies(res: NextResponse, tokens: IssuedTokens): NextResponse {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  })
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: Math.max(1, Math.floor((tokens.refreshExpiresAt.getTime() - Date.now()) / 1000)),
  })
  return res
}

export function clearAuthCookies(res: NextResponse): NextResponse {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 })
  res.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 })
  return res
}

export function readAccessToken(req: NextRequest): string | null {
  return req.cookies.get(ACCESS_COOKIE)?.value ?? null
}

export function readRefreshToken(req: NextRequest): string | null {
  return req.cookies.get(REFRESH_COOKIE)?.value ?? null
}

export function isNativeClient(req: NextRequest): boolean {
  return req.headers.get("x-client") === "native"
}

export function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
}
