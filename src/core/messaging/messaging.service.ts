import "server-only"

import { createMessage, listMessages } from "@/infra/db/repositories/messages.repository"
import { findInquiryById } from "@/infra/db/repositories/inquiries.repository"
import type { MessagingTransport } from "./ports"

/** DB-backed polling driver — the only implementation today, chosen because
 * Vercel serverless can't hold a WebSocket open anyway, and it's exactly
 * what a React Native client does too (no platform-specific real-time
 * plumbing needed for the MVP). */
export const pollingTransport: MessagingTransport = {
  async send({ inquiryId, senderId, body }) {
    return createMessage({ inquiryId, senderId, body })
  },
  async poll(inquiryId, since) {
    return listMessages(inquiryId, since)
  },
}

export type AuthorizationResult = { authorized: true } | { authorized: false }

/** A user may read/send on an inquiry only if they're the buyer or the
 * owner of the business being inquired about. */
export async function authorizeInquiryAccess(inquiryId: string, userId: string): Promise<AuthorizationResult> {
  const inquiry = await findInquiryById(inquiryId)
  if (!inquiry) return { authorized: false }
  if (inquiry.buyerId === userId || inquiry.business.ownerId === userId) {
    return { authorized: true }
  }
  return { authorized: false }
}
