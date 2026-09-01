import "server-only"
import { env } from "@/config/env"
import type { OtpProvider } from "@/core/auth/ports"

/**
 * Twilio SMS OTP provider.
 * https://www.twilio.com/docs/messaging/api/message-resource
 */
export const twilioOtpProvider: OtpProvider = {
  name: "twilio",
  async send({ phoneE164, code }) {
    const accountSid = env.TWILIO_ACCOUNT_SID
    const authToken = env.TWILIO_AUTH_TOKEN
    const from = env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !from) {
      console.error(
        "[otp:twilio] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER must be set"
      )
      return { delivered: false }
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({
      To: phoneE164,
      From: from,
      Body: `Your Kaarigar verification code is: ${code}. Do not share it with anyone.`,
    })

    try {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: body.toString(),
      })

      const text = await res.text()
      let providerRef = "unknown"

      try {
        const data = text ? (JSON.parse(text) as { sid?: string }) : {}
        providerRef = data.sid ?? providerRef
      } catch {
        providerRef = text.slice(0, 200) || providerRef
      }

      if (!res.ok) {
        console.error("[otp:twilio] send failed:", res.status, text)
        return { delivered: false, providerRef }
      }

      return { delivered: true, providerRef }
    } catch (err) {
      console.error("[otp:twilio] request threw:", err)
      return { delivered: false }
    }
  },
}
