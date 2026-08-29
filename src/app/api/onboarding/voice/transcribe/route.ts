import { NextResponse, type NextRequest } from "next/server"

import { transcribeAudio } from "@/core/business/onboarding.service"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { requireCsrf } from "@/infra/http/csrf"

const MAX_AUDIO_BYTES = 15 * 1024 * 1024 // 15MB — a few minutes of webm/opus

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const file = form.get("audio")
  const draftId = form.get("draftId")
  const purpose = form.get("purpose")
  const languageHint = form.get("languageHint")

  if (
    !(file instanceof File) ||
    typeof draftId !== "string" ||
    (purpose !== "business_onboarding" && purpose !== "product_catalog")
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await transcribeAudio({
    draftId,
    purpose,
    audio: buffer,
    mimeType: file.type || "audio/webm",
    languageHint: typeof languageHint === "string" ? languageHint : undefined,
  })

  return NextResponse.json(result)
}
