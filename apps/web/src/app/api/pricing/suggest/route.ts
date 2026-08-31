import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { suggestPrice } from "@/core/pricing/pricing.service"

const bodySchema = z.object({
  productId: z.string().uuid().optional(),
  category: z.string().min(2).max(80),
  material: z.string().max(80).optional(),
  sizeBand: z.enum(["small", "medium", "large"]).default("medium"),
  region: z.string().max(80).optional(),
  leadTimeDays: z.number().int().min(1).max(120).default(14),
  experienceYears: z.number().int().min(0).max(90).default(5),
  descriptionEn: z.string().max(2000).optional(),
  materialCost: z.number().min(0).optional(),
  locale: z.enum(["en", "hi", "mr"]).default("en"),
})

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const suggestion = await suggestPrice(parsed.data)
  return NextResponse.json(suggestion)
}
