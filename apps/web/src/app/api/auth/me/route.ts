import { NextResponse, type NextRequest } from "next/server"

import { verifyAccessToken } from "@/core/auth/jwt"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { isNativeClient, readAccessToken } from "@/infra/http/auth-cookies"

export async function GET(req: NextRequest) {
  const token = isNativeClient(req)
    ? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null
    : readAccessToken(req)

  if (!token) return NextResponse.json({ user: null }, { status: 200 })

  const payload = await verifyAccessToken(token)
  if (!payload) return NextResponse.json({ user: null }, { status: 200 })

  const user = await findUserById(payload.sub)
  if (!user) return NextResponse.json({ user: null }, { status: 200 })

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      phoneE164: user.phoneE164,
      role: user.role,
      locale: user.locale,
      avatarUrl: user.avatarUrl,
    },
  })
}
