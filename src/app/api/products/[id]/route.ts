import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { updateProductListing } from "@/core/business/catalog.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({
  titleEn: z.string().min(2).max(200).optional(),
  descriptionEn: z.string().max(4000).optional(),
  materials: z.array(z.string()).optional(),
  dimensions: z.string().max(120).optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  seoKeywords: z.array(z.string().max(40)).max(15).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const { id } = await params
  const result = await updateProductListing({ productId: id, ownerId: user.sub, ...parsed.data })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 404 })
  }

  return NextResponse.json({ ok: true })
}
