import { NextResponse, type NextRequest } from "next/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { authorizeInquiryAccess } from "@/core/messaging/messaging.service"
import { authorizeChannel } from "@/infra/messaging/pusher-server"
import { features } from "@/config/env"

/** Pusher's private-channel auth contract: the client posts `socket_id` +
 * `channel_name` here before subscribing; we confirm the user is actually a
 * party to the inquiry (buyer or business owner) before signing. */
export async function POST(req: NextRequest) {
  if (!features.pusher) return NextResponse.json({ error: "not_configured" }, { status: 404 })
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const socketId = form?.get("socket_id")
  const channelName = form?.get("channel_name")
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const inquiryId = channelName.replace(/^private-inquiry-/, "")
  if (inquiryId === channelName) {
    return NextResponse.json({ error: "invalid_channel" }, { status: 400 })
  }

  const auth = await authorizeInquiryAccess(inquiryId, user.sub)
  if (!auth.authorized) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const authResponse = authorizeChannel(socketId, channelName)
  return NextResponse.json(authResponse)
}
