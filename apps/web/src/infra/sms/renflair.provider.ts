import "server-only"
import { renflairWhatsappApiKeys } from "@/config/env"
import type { OtpProvider } from "@/core/auth/ports"

const RENFLAIR_WHATSAPP_URL = "https://whatsapp.renflair.in/V1.php"

type SendAttempt = { delivered: boolean; providerRef?: string; exhausted: boolean }

/** Split E.164 into Renflair's COUNTRY + PHONE params (national number, no +). */
function toRenflairPhone(phoneE164: string): { country: string; phone: string } | null {
  const digits = phoneE164.replace(/\D/g, "")

  if (phoneE164.startsWith("+91") && digits.length === 12) {
    return { country: "91", phone: digits.slice(2) }
  }
  if (phoneE164.startsWith("+1") && digits.length === 11) {
    return { country: "1", phone: digits.slice(1) }
  }

  const match = phoneE164.match(/^\+(\d{1,3})(\d{7,14})$/)
  if (!match) return null
  return { country: match[1], phone: match[2] }
}

function isKeyExhausted(status: number, text: string): boolean {
  const lower = text.toLowerCase()
  return (
    status === 402 ||
    status === 429 ||
    /exhaust|quota|limit|balance|credit|insufficient|no.?credit|api.?key|invalid.?key|expired/i.test(lower)
  )
}

async function sendWithKey(
  apiKey: string,
  parsed: { country: string; phone: string },
  code: string
): Promise<SendAttempt> {
  const url = new URL(RENFLAIR_WHATSAPP_URL)
  url.searchParams.set("API", apiKey)
  url.searchParams.set("PHONE", parsed.phone)
  url.searchParams.set("OTP", code)
  url.searchParams.set("COUNTRY", parsed.country)

  const res = await fetch(url.toString(), { method: "GET" })
  const text = await res.text()

  let delivered = res.ok
  let providerRef = "unknown"

  if (text.trim()) {
    try {
      const data = JSON.parse(text) as { success?: boolean; message?: string; request_id?: string }
      delivered = res.ok && data.success !== false
      providerRef = data.request_id ?? data.message ?? providerRef
    } catch {
      delivered = res.ok && /success/i.test(text)
      providerRef = text.slice(0, 200)
    }
  }

  const exhausted = !delivered && isKeyExhausted(res.status, text)

  if (!delivered) {
    console.error("[otp:renflair] send failed:", res.status, text)
  }

  return { delivered, providerRef, exhausted }
}

/**
 * RENFLAIR WhatsApp OTP provider with API-key fallback chain.
 * https://whatsapp.renflair.in/V1.php?API=...&PHONE=...&OTP=...&COUNTRY=...
 */
export const renflairOtpProvider: OtpProvider = {
  name: "renflair",
  async send({ phoneE164, code }) {
    const apiKeys = renflairWhatsappApiKeys()
    if (apiKeys.length === 0) {
      console.error("[otp:renflair] No Renflair API keys configured (RENFLAIR_WHATSAPP_API_KEY_*)")
      return { delivered: false }
    }

    const parsed = toRenflairPhone(phoneE164)
    if (!parsed) {
      console.error("[otp:renflair] could not parse phone for Renflair:", phoneE164)
      return { delivered: false }
    }

    try {
      for (let i = 0; i < apiKeys.length; i++) {
        const result = await sendWithKey(apiKeys[i], parsed, code)
        if (result.delivered) {
          if (i > 0) {
            console.info(`[otp:renflair] delivered using fallback key #${i + 1}`)
          }
          return { delivered: true, providerRef: result.providerRef }
        }

        const hasNext = i < apiKeys.length - 1
        if (hasNext && result.exhausted) {
          console.warn(`[otp:renflair] key #${i + 1} exhausted — trying fallback key #${i + 2}`)
          continue
        }

        return { delivered: false, providerRef: result.providerRef }
      }

      return { delivered: false }
    } catch (err) {
      console.error("[otp:renflair] request threw:", err)
      return { delivered: false }
    }
  },
}
