import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { logout } from "@/core/auth/session.service"
import { clearAuthCookies, isNativeClient, readRefreshToken } from "@/infra/http/auth-cookies"
import { requireCsrf } from "@/infra/http/csrf"

const nativeBodySchema = z.object({ refreshToken: z.string().min(20) })

export async function POST(req: NextRequest) {
  const native = isNativeClient(req)
  if (!native && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  let token: string | null
  if (native) {
    const parsed = nativeBodySchema.safeParse(await req.json().catch(() => null))
    token = parsed.success ? parsed.data.refreshToken : null
  } else {
    token = readRefreshToken(req)
  }

  if (token) await logout(token)

  const res = NextResponse.json({ ok: true })
  if (!native) clearAuthCookies(res)
  return res
}
