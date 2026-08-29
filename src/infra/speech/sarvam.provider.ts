import "server-only"
import { env } from "@/config/env"
import type { SpeechProvider } from "@/core/business/ports"

/**
 * Sarvam AI speech-to-text (`saarika` model) — primary provider, covers
 * Hindi and most major Indian regional languages.
 * Docs: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
 */
export const sarvamSpeechProvider: SpeechProvider = {
  name: "sarvam",
  async transcribe({ audio, mimeType, languageHint }) {
    const form = new FormData()
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "audio.webm")
    form.append("model", "saarika:v2")
    if (languageHint) form.append("language_code", languageHint)

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": env.SARVAM_API_KEY! },
      body: form,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`sarvam speech-to-text failed: ${res.status} ${body}`)
    }

    const data = (await res.json()) as { transcript?: string; language_code?: string }
    if (!data.transcript) {
      throw new Error("sarvam speech-to-text returned no transcript")
    }

    return { transcript: data.transcript, language: data.language_code ?? languageHint ?? "hi" }
  },
}
