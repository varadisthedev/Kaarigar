import "server-only"
import { env } from "@/config/env"
import type { OtpProvider } from "@/core/auth/ports"

const RENFLAIR_WHATSAPP_URL = "https://whatsapp.renflair.in/V1.php"

/** Split E.164 into Renflair's COUNTRY + PHONE params (national number, no +). */
function toRenflairPhone(phoneE164: string): { country: string; phone: string } | null {
  const digits = phoneE164.replace(/\D/g, "")

  if (phoneE164.startsWith("+91") && digits.length === 12) {
    return { country: "91", phone: digits.slice(2) }
  }
  if (phoneE164.startsWith("+1") && digits.length === 11) {
    return { country: "1", phone: digits.slice(1) }
  }

  // Generic: country code 1–3 digits, rest is national number.
  const match = phoneE164.match(/^\+(\d{1,3})(\d{7,14})$/)
  if (!match) return null
  return { country: match[1], phone: match[2] }
}

/**
 * RENFLAIR WhatsApp OTP provider.
 * https://whatsapp.renflair.in/V1.php?API=...&PHONE=...&OTP=...&COUNTRY=...
 */
export const renflairOtpProvider: OtpProvider = {
  name: "renflair",
  async send({ phoneE164, code }) {
    const apiKey = env.RENFLAIR_WHATSAPP_API_KEY
    if (!apiKey) {
      console.error("[otp:renflair] RENFLAIR_WHATSAPP_API_KEY is not configured")
      return { delivered: false }
    }

    const parsed = toRenflairPhone(phoneE164)
    if (!parsed) {
      console.error("[otp:renflair] could not parse phone for Renflair:", phoneE164)
      return { delivered: false }
    }

    const url = new URL(RENFLAIR_WHATSAPP_URL)
    url.searchParams.set("API", apiKey)
    url.searchParams.set("PHONE", parsed.phone)
    url.searchParams.set("OTP", code)
    url.searchParams.set("COUNTRY", parsed.country)

    try {
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

      if (!delivered) {
        console.error("[otp:renflair] send failed:", res.status, text)
      }

      return { delivered, providerRef }
    } catch (err) {
      console.error("[otp:renflair] request threw:", err)
      return { delivered: false }
    }
  },
}
