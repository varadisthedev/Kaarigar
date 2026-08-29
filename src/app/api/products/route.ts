import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createProductListing } from "@/core/business/catalog.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({
  businessId: z.string().uuid(),
  titleEn: z.string().min(2).max(200),
  titleHi: z.string().max(200).optional(),
  descriptionEn: z.string().max(4000).optional(),
  descriptionHi: z.string().max(4000).optional(),
  materials: z.array(z.string()).optional(),
  dimensions: z.string().max(120).optional(),
  moq: z.number().int().positive().optional(),
  unit: z.string().max(30).optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  seoKeywords: z.array(z.string()).optional(),
  photos: z
    .array(z.object({ url: z.string().url(), publicId: z.string(), enhancedUrl: z.string().url().optional() }))
    .min(1),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const result = await createProductListing({ ...parsed.data, ownerId: user.sub })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 404 })
  }

  return NextResponse.json({ ok: true, product: result.product })
}
