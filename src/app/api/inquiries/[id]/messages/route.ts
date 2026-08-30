import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { pollingTransport, authorizeInquiryAccess } from "@/core/messaging/messaging.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { notifyNewMessage } from "@/infra/messaging/pusher-server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { id } = await params
  const auth = await authorizeInquiryAccess(id, user.sub)
  if (!auth.authorized) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const sinceParam = req.nextUrl.searchParams.get("since")
  const since = sinceParam ? new Date(sinceParam) : undefined

  const messages = await pollingTransport.poll(id, since)
  return NextResponse.json({ messages })
}

const bodySchema = z.object({ body: z.string().min(1).max(2000) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { id } = await params
  const auth = await authorizeInquiryAccess(id, user.sub)
  if (!auth.authorized) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const message = await pollingTransport.send({ inquiryId: id, senderId: user.sub, body: parsed.data.body })
  await notifyNewMessage(id, message)
  return NextResponse.json({ message })
}
