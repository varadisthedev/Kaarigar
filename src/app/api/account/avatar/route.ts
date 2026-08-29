import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { replaceAvatar, removeAvatar } from "@/core/account/avatar.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({ url: z.string().url(), publicId: z.string().min(1) })

export async function PUT(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const updated = await replaceAvatar(user.sub, parsed.data)
  return NextResponse.json({ ok: true, avatarUrl: updated.avatarUrl })
}

export async function DELETE(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  await removeAvatar(user.sub)
  return NextResponse.json({ ok: true })
}
