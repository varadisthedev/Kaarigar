import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { submitBusiness } from "@/core/business/onboarding.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({
  draftId: z.string().min(1),
  displayName: z.string().min(2).max(160),
  craftCategory: z.string().min(2).max(80),
  descriptionEn: z.string().max(4000).optional(),
  descriptionHi: z.string().max(4000).optional(),
  district: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: z.string().max(10).optional(),
  yearsExperience: z.number().int().min(0).max(90).optional(),
  monthlyCapacity: z.string().max(80).optional(),
  photos: z
    .array(z.object({ url: z.string().url(), publicId: z.string(), enhancedUrl: z.string().url().optional() }))
    .min(1, "At least one photo is required"),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const business = await submitBusiness({ ...parsed.data, ownerId: user.sub })
  return NextResponse.json({ ok: true, business: { id: business.id, status: business.status } })
}
