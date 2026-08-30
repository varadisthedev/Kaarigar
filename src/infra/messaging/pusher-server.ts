import "server-only"
import Pusher from "pusher"

import { env, features } from "@/config/env"

let _client: Pusher | null = null

function client(): Pusher {
  if (!features.pusher) {
    throw new Error("Pusher is not configured — add PUSHER_APP_ID/KEY/SECRET/CLUSTER to .env.local.")
  }
  if (!_client) {
    _client = new Pusher({
      appId: env.PUSHER_APP_ID!,
      key: env.PUSHER_KEY!,
      secret: env.PUSHER_SECRET!,
      cluster: env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  }
  return _client
}

export function inquiryChannelName(inquiryId: string): string {
  return `private-inquiry-${inquiryId}`
}

/** Fire-and-forget notify — chat persistence never depends on this succeeding. */
export async function notifyNewMessage(inquiryId: string, message: unknown): Promise<void> {
  if (!features.pusher) return
  try {
    await client().trigger(inquiryChannelName(inquiryId), "new-message", message)
  } catch (err) {
    console.error("[pusher] failed to publish new-message event", err)
  }
}

export function authorizeChannel(socketId: string, channelName: string) {
  return client().authorizeChannel(socketId, channelName)
}
