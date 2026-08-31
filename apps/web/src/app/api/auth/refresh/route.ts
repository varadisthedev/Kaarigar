import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { rotateSession } from "@/core/auth/session.service"
import {
  attachAuthCookies,
  clearAuthCookies,
  clientIp,
  isNativeClient,
  readRefreshToken,
} from "@/infra/http/auth-cookies"

const nativeBodySchema = z.object({ refreshToken: z.string().min(20) })

export async function POST(req: NextRequest) {
  const native = isNativeClient(req)

  let presentedToken: string | null
  if (native) {
    const parsed = nativeBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    presentedToken = parsed.data.refreshToken
  } else {
    presentedToken = readRefreshToken(req)
  }

  if (!presentedToken) {
    return NextResponse.json({ error: "no_session" }, { status: 401 })
  }

  const result = await rotateSession(presentedToken, {
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  })

  if (!result.ok) {
    const res = NextResponse.json({ error: result.error }, { status: 401 })
    if (!native) clearAuthCookies(res)
    return res
  }

  const body = native
    ? {
        ok: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshExpiresAt: result.refreshExpiresAt,
      }
    : { ok: true }

  const res = NextResponse.json(body)
  if (!native) attachAuthCookies(res, result)
  return res
}
