import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { submitBusiness } from "@/core/business/onboarding.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"

const mediaSchema = z.object({ url: z.string().url(), publicId: z.string(), enhancedUrl: z.string().url().optional() })

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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  photos: z.array(mediaSchema).min(1, "At least one photo is required"),
  video: z.object({ url: z.string().url(), publicId: z.string() }).optional(),
  product: z
    .object({
      titleEn: z.string().min(2).max(160),
      titleHi: z.string().max(160).optional(),
      descriptionEn: z.string().max(4000).optional(),
      descriptionHi: z.string().max(4000).optional(),
      materials: z.array(z.string()).optional(),
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().min(0).optional(),
      photos: z.array(mediaSchema).min(1, "At least one product photo is required"),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const existingBusinesses = await findBusinessesByOwner(user.sub)
  if (existingBusinesses.length > 0) {
    return NextResponse.json({ error: "business_exists" }, { status: 409 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const business = await submitBusiness({ ...parsed.data, ownerId: user.sub }).catch((err) => {
    if (err instanceof Error && err.message === "business_exists") return null
    throw err
  })
  if (!business) {
    return NextResponse.json({ error: "business_exists" }, { status: 409 })
  }
  return NextResponse.json({
    ok: true,
    business: { id: business.id, status: business.status, businessCode: business.businessCode },
  })
}
