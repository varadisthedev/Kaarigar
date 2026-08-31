import "server-only"

import { createMessage, listMessages } from "@/infra/db/repositories/messages.repository"
import { findInquiryById, updateInquiryStatus } from "@/infra/db/repositories/inquiries.repository"
import type { MessagingTransport } from "./ports"
import type { Inquiry } from "@/infra/db/schema"

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

export type RespondToInquiryResult =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; error: "not_found" | "forbidden" | "invalid_state" }

/**
 * Only the business owner (the seller) can accept or decline — the buyer's
 * "propose a deal" already happened by sending the inquiry. Accepting is
 * what unlocks the direct-call action for both sides (see `phoneReveal`
 * below): phone numbers stay private until there's actual mutual interest,
 * not scrapeable off the open marketplace.
 */
export async function respondToInquiry(input: {
  inquiryId: string
  sellerId: string
  decision: "accepted" | "declined"
}): Promise<RespondToInquiryResult> {
  const inquiry = await findInquiryById(input.inquiryId)
  if (!inquiry) return { ok: false, error: "not_found" }
  if (inquiry.business.ownerId !== input.sellerId) return { ok: false, error: "forbidden" }
  if (inquiry.status !== "open") return { ok: false, error: "invalid_state" }

  const updated = await updateInquiryStatus(input.inquiryId, input.decision)
  return { ok: true, inquiry: updated }
}

export type PhoneRevealResult =
  | { ok: true; phoneE164: string }
  | { ok: false; error: "not_found" | "forbidden" | "not_accepted" | "no_phone_on_file" }

/** The other party's number — buyer sees the business owner's, seller sees
 * the buyer's — gated on the inquiry being accepted. An OAuth-only account
 * (Google/GitHub, no phone) has nothing to reveal here — that's a real,
 * distinct outcome from "not accepted yet", not an error to hide. */
export async function revealCounterpartyPhone(inquiryId: string, userId: string): Promise<PhoneRevealResult> {
  const inquiry = await findInquiryById(inquiryId)
  if (!inquiry) return { ok: false, error: "not_found" }

  const isBuyer = inquiry.buyerId === userId
  const isSeller = inquiry.business.ownerId === userId
  if (!isBuyer && !isSeller) return { ok: false, error: "forbidden" }
  if (inquiry.status !== "accepted") return { ok: false, error: "not_accepted" }

  const phoneE164 = isBuyer ? inquiry.business.owner.phoneE164 : inquiry.buyer.phoneE164
  if (!phoneE164) return { ok: false, error: "no_phone_on_file" }

  return { ok: true, phoneE164 }
}
