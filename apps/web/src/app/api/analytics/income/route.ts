import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"
import {
  getMonthlyPaymentSummaryForSeller,
  getMonthlyIncomeTarget,
  setMonthlyIncomeTarget,
} from "@/infra/db/repositories/analytics.repository"

async function primaryBusinessId(userId: string): Promise<string | null> {
  const businesses = await findBusinessesByOwner(userId)
  return businesses.find((b) => b.status === "approved")?.id ?? businesses[0]?.id ?? null
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const businessId = await primaryBusinessId(user.sub)
  if (!businessId) return NextResponse.json({ target: null, advanceReceived: 0, remainingOrderValue: 0 })

  const [summary, target] = await Promise.all([
    getMonthlyPaymentSummaryForSeller(user.sub),
    getMonthlyIncomeTarget(businessId),
  ])

  return NextResponse.json({ target, ...summary })
}

const bodySchema = z.object({ target: z.number().positive() })

export async function PATCH(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const businessId = await primaryBusinessId(user.sub)
  if (!businessId) return NextResponse.json({ error: "no_business" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  await setMonthlyIncomeTarget(businessId, parsed.data.target)
  return NextResponse.json({ ok: true })
}
