import type { Message } from "@/infra/db/schema"

/**
 * The seam for swapping the MVP's DB-backed polling transport for a
 * real-time driver (Pusher/Ably) later without touching call sites — the
 * chat UI polls `poll()` on an interval today; a future driver could push
 * instead, behind this same interface.
 */
export interface MessagingTransport {
  send(input: { inquiryId: string; senderId: string; body: string }): Promise<Message>
  poll(inquiryId: string, since?: Date): Promise<Message[]>
}
