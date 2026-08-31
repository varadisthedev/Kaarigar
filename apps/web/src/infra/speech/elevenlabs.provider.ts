import "server-only"
import { env } from "@/config/env"

/**
 * ElevenLabs text-to-speech — narrates the fixed onboarding prompt script.
 * `eleven_multilingual_v2` covers both English and Hindi from the same
 * voice. Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
 */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY!,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`elevenlabs text-to-speech failed: ${res.status} ${body}`)
  }

  return Buffer.from(await res.arrayBuffer())
}
