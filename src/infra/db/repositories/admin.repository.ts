import "server-only"
import { eq } from "drizzle-orm"

import { getDb } from "../client"
import { reviewActions, auditLog, businesses, type NewReviewAction, type NewAuditLogEntry } from "../schema"

export async function createReviewAction(input: NewReviewAction) {
  const db = getDb()
  const [action] = await db.insert(reviewActions).values(input).returning()
  return action
}

export async function createAuditLogEntry(input: NewAuditLogEntry) {
  const db = getDb()
  const [entry] = await db.insert(auditLog).values(input).returning()
  return entry
}

export async function businessCodeExists(code: string): Promise<boolean> {
  const db = getDb()
  const existing = await db.query.businesses.findFirst({ where: eq(businesses.businessCode, code) })
  return Boolean(existing)
}
