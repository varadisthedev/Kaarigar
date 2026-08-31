import "server-only"

import { findBusinessById, approveBusiness, rejectBusiness } from "@/infra/db/repositories/business.repository"
import { createReviewAction, createAuditLogEntry, businessCodeExists } from "@/infra/db/repositories/admin.repository"
import { generateBusinessCode } from "./business-code"

export type ReviewResult =
  | { ok: true; business: { id: string; businessCode?: string | null; status: string } }
  | { ok: false; error: "not_found" | "already_reviewed" }

async function uniqueBusinessCode(state: string | null | undefined): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateBusinessCode(state)
    if (!(await businessCodeExists(candidate))) return candidate
  }
  // Astronomically unlikely at MVP scale, but never loop forever.
  return `${generateBusinessCode(state)}-${Date.now().toString(36)}`
}

/** MVP: admin review is bypassed for now — every submission is approved
 * immediately, straight from `submitBusiness`, no human in the loop. No
 * review action / audit log entry is written (there's no admin actor to
 * attribute it to); `reviewedBy` stays null to make that visible in the
 * data. `approveBusinessSubmission` below is left intact, unused, so
 * re-enabling human review later is just wiring the admin route back in. */
export async function autoApproveBusiness(businessId: string, state: string | null | undefined): Promise<string> {
  const businessCode = await uniqueBusinessCode(state)
  await approveBusiness(businessId, businessCode, null)
  return businessCode
}

export async function approveBusinessSubmission(businessId: string, adminId: string): Promise<ReviewResult> {
  const business = await findBusinessById(businessId)
  if (!business) return { ok: false, error: "not_found" }
  if (business.status !== "pending_review") return { ok: false, error: "already_reviewed" }

  const businessCode = await uniqueBusinessCode(business.state)
  const updated = await approveBusiness(businessId, businessCode, adminId)

  await createReviewAction({ businessId, adminId, action: "approve" })
  await createAuditLogEntry({
    actorId: adminId,
    action: "business.approve",
    entityType: "business",
    entityId: businessId,
    metadata: { businessCode },
  })

  return { ok: true, business: { id: updated.id, businessCode: updated.businessCode, status: updated.status } }
}

export async function rejectBusinessSubmission(
  businessId: string,
  adminId: string,
  reason: string
): Promise<ReviewResult> {
  const business = await findBusinessById(businessId)
  if (!business) return { ok: false, error: "not_found" }
  if (business.status !== "pending_review") return { ok: false, error: "already_reviewed" }

  const updated = await rejectBusiness(businessId, reason, adminId)

  await createReviewAction({ businessId, adminId, action: "reject", reason })
  await createAuditLogEntry({
    actorId: adminId,
    action: "business.reject",
    entityType: "business",
    entityId: businessId,
    metadata: { reason },
  })

  return { ok: true, business: { id: updated.id, status: updated.status } }
}
