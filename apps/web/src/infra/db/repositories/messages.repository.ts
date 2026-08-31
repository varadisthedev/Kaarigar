import "server-only"
import { and, asc, eq, gt } from "drizzle-orm"

import { getDb } from "../client"
import { messages, type NewMessage } from "../schema"

export async function createMessage(input: NewMessage) {
  const db = getDb()
  const [message] = await db.insert(messages).values(input).returning()
  return message
}

/** Polling contract: pass `since` (an ISO timestamp, usually the last
 * message's createdAt the client already has) to get only what's new. */
export async function listMessages(inquiryId: string, since?: Date) {
  const db = getDb()
  return db.query.messages.findMany({
    where: and(eq(messages.inquiryId, inquiryId), since ? gt(messages.createdAt, since) : undefined),
    orderBy: asc(messages.createdAt),
  })
}
