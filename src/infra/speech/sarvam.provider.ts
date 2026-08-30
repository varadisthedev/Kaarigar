import "server-only"
import { env } from "@/config/env"
import type { SpeechProvider } from "@/core/business/ports"

/**
 * Sarvam AI speech-to-text (`saaras:v3` model) — primary provider, covers
 * Hindi and most major Indian regional languages.
 * Docs: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
 *
 * Was `saarika:v2` — Sarvam deprecated that model server-side (confirmed via
 * a live API call against this project's key, which returned a 400 naming
 * `saaras:v3` as the replacement). Same request/response shape, just a
 * different model id — if Sarvam deprecates this one too, the fix is the
 * same one-line change.
 */
export const sarvamSpeechProvider: SpeechProvider = {
  name: "sarvam",
  async transcribe({ audio, mimeType, languageHint }) {
    const form = new FormData()
    form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "audio.webm")
    form.append("model", "saaras:v3")
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
