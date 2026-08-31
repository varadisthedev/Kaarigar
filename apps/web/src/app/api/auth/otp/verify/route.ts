import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { verifyOtp } from "@/core/auth/otp.service"
import { issueSession } from "@/core/auth/session.service"
import { findOrCreateUserByPhone } from "@/infra/db/repositories/users.repository"
import { attachAuthCookies, clientIp, isNativeClient } from "@/infra/http/auth-cookies"
import { requireCsrf } from "@/infra/http/csrf"

const bodySchema = z.object({
  phoneE164: z.string().min(8).max(20),
  countryCode: z.string().min(2).max(6),
  code: z.string().length(6),
  purpose: z.enum(["login", "phone_verify"]).default("login"),
  locale: z.enum(["en", "hi", "mr"]).default("en"),
})

export async function POST(req: NextRequest) {
  const native = isNativeClient(req)
  if (!native && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }
  const { phoneE164, countryCode, code, purpose, locale } = parsed.data

  const result = await verifyOtp({ phoneE164, purpose, code })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const user = await findOrCreateUserByPhone({ phoneE164, countryCode, locale })
  const tokens = await issueSession(user, {
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  })

  const body = {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role,
      locale: user.locale,
      profileCompleted: Boolean(user.profileCompletedAt),
    },
    ...(native
      ? {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          refreshExpiresAt: tokens.refreshExpiresAt,
        }
      : {}),
  }

  const res = NextResponse.json(body)
  if (!native) attachAuthCookies(res, tokens)
  return res
}
