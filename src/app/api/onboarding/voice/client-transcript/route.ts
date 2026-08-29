import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { saveClientTranscript } from "@/core/business/onboarding.service"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { requireCsrf } from "@/infra/http/csrf"

const bodySchema = z.object({
  draftId: z.string().min(1),
  purpose: z.enum(["business_onboarding", "product_catalog"]),
  transcript: z.string().min(1).max(5000),
  language: z.string().min(2).max(10),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const { draft } = await saveClientTranscript(parsed.data)
  return NextResponse.json({ ok: true, draft })
}
