import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { requestOtp } from "@/core/auth/otp.service"
import { clientIp, isNativeClient } from "@/infra/http/auth-cookies"
import { requireCsrf } from "@/infra/http/csrf"

const bodySchema = z.object({
  phoneE164: z.string().min(8).max(20),
  purpose: z.enum(["login", "phone_verify"]).default("login"),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const result = await requestOtp({
    phoneE164: parsed.data.phoneE164,
    purpose: parsed.data.purpose,
    ip: clientIp(req),
  })

  if (!result.ok) {
    const status = result.error === "rate_limited" ? 429 : 400
    return NextResponse.json(
      { error: result.error, ...(result.error === "rate_limited" ? { retryAfterSeconds: result.retryAfterSeconds } : {}) },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...(result.devCode ? { devCode: result.devCode } : {}) })
}
