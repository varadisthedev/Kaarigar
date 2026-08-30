"use client"

import PusherClient from "pusher-js"

let _client: PusherClient | null = null

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)cm_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** Client-side singleton — authenticates private channels via
 * `/api/pusher/auth`, which checks the requester is a party to the inquiry. */
export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  if (!key || !cluster) return null

  if (!_client) {
    _client = new PusherClient(key, {
      cluster,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
        headers: { "x-csrf-token": readCsrfCookie() ?? "" },
      },
    })
  }
  return _client
}

export function inquiryChannelName(inquiryId: string): string {
  return `private-inquiry-${inquiryId}`
}
