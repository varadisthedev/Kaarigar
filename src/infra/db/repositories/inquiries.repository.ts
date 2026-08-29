import "server-only"
import { desc, eq, or } from "drizzle-orm"

import { getDb } from "../client"
import { inquiries, businesses, type NewInquiry } from "../schema"

export async function createInquiry(input: NewInquiry) {
  const db = getDb()
  const [inquiry] = await db.insert(inquiries).values(input).returning()
  return inquiry
}

export async function findInquiryById(id: string) {
  const db = getDb()
  return db.query.inquiries.findFirst({
    where: eq(inquiries.id, id),
    with: { business: true, product: true, buyer: true },
  })
}

/** Every inquiry where the given user is either the buyer or the owner of
 * the business being inquired about. */
export async function listInquiriesForUser(userId: string) {
  const db = getDb()
  const owned = await db.query.businesses.findMany({
    where: eq(businesses.ownerId, userId),
    columns: { id: true },
  })
  const ownedIds = owned.map((b) => b.id)

  return db.query.inquiries.findMany({
    where: or(eq(inquiries.buyerId, userId), ...ownedIds.map((id) => eq(inquiries.businessId, id))),
    orderBy: desc(inquiries.updatedAt),
    with: { business: true, product: true, buyer: true },
  })
}

export async function updateInquiryStatus(
  id: string,
  status: "open" | "accepted" | "declined" | "closed"
) {
  const db = getDb()
  const [inquiry] = await db
    .update(inquiries)
    .set({ status, updatedAt: new Date() })
    .where(eq(inquiries.id, id))
    .returning()
  return inquiry
}
