import "server-only"
import { env } from "@/config/env"
import type { OtpProvider } from "@/core/auth/ports"

type TwilioErrorBody = {
  code?: number
  message?: string
  more_info?: string
}

function normalizeE164(phone: string): string {
  const trimmed = phone.trim()
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`
}

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
    const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID

    if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
      console.error(
        "[otp:twilio] Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN and either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID"
      )
      return { delivered: false }
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const body = new URLSearchParams({
      To: normalizeE164(phoneE164),
      Body: `Your Kaarigar verification code is: ${code}. Do not share it with anyone.`,
    })
    if (messagingServiceSid) {
      body.set("MessagingServiceSid", messagingServiceSid)
    } else {
      body.set("From", normalizeE164(from!))
    }

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
      let twilioError: TwilioErrorBody | null = null

      try {
        const data = text ? (JSON.parse(text) as { sid?: string } & TwilioErrorBody) : {}
        providerRef = data.sid ?? providerRef
        if (!res.ok) twilioError = data
      } catch {
        providerRef = text.slice(0, 200) || providerRef
      }

      if (!res.ok) {
        console.error("[otp:twilio] send failed:", res.status, text)
        if (twilioError?.code === 20003) {
          console.error(
            "[otp:twilio] Auth failed — use the Account Auth Token (not OAuth Client Secret) in TWILIO_AUTH_TOKEN"
          )
        }
        if (twilioError?.code === 21408) {
          console.error(
            "[otp:twilio] Enable India in Twilio Console → Messaging → Settings → Geo Permissions"
          )
        }
        return { delivered: false, providerRef }
      }

      return { delivered: true, providerRef }
    } catch (err) {
      console.error("[otp:twilio] request threw:", err)
      return { delivered: false }
    }
  },
}
