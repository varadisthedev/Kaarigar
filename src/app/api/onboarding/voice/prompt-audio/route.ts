import "server-only"
import { NextResponse, type NextRequest } from "next/server"
import { v2 as cloudinary } from "cloudinary"

import { env, features } from "@/config/env"
import { synthesizeSpeech } from "@/infra/speech/elevenlabs.provider"
import { isPromptKey } from "@/core/onboarding/voice-script"
import en from "@/i18n/messages/en.json"
import hi from "@/i18n/messages/hi.json"

const MESSAGES = { en, hi } as const

let configured = false
function ensureCloudinaryConfigured() {
  if (configured) return
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  configured = true
}

/**
 * Serves cached narration audio for one fixed onboarding prompt. Only ever
 * synthesizes a given key+locale once, globally: the Cloudinary lookup
 * happens *before* any ElevenLabs call, so repeat requests (from any user,
 * any session) never spend ElevenLabs credits again. Returns `{ ok: false }`
 * — never an error — whenever ElevenLabs or Cloudinary isn't configured, so
 * the client falls back to the browser's own speechSynthesis.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? ""
  const locale = req.nextUrl.searchParams.get("locale") === "hi" ? "hi" : "en"

  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 })
  }
  if (!features.elevenlabs || !features.cloudinary) {
    return NextResponse.json({ ok: false })
  }

  const text = MESSAGES[locale].onboarding[key]
  if (!text) {
    return NextResponse.json({ ok: false })
  }

  ensureCloudinaryConfigured()
  const publicId = `Kaarigar/tts/${locale}/${key}`

  try {
    const existing = await cloudinary.api.resource(publicId, { resource_type: "video" })
    return NextResponse.json({ ok: true, url: existing.secure_url })
  } catch {
    // Not cached yet — fall through to synthesize + upload below.
  }

  try {
    const audio = await synthesizeSpeech(text)
    const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: "video", overwrite: false },
        (err, result) => (err || !result ? reject(err) : resolve(result))
      )
      stream.end(audio)
    })
    return NextResponse.json({ ok: true, url: uploaded.secure_url })
  } catch (err) {
    console.error("[onboarding/voice/prompt-audio]", err)
    return NextResponse.json({ ok: false })
  }
}
