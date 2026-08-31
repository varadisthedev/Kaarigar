import "server-only"
import { env } from "@/config/env"
import type { OtpProvider } from "@/core/auth/ports"

/**
 * MSG91 Send-OTP API (v5). Requires an MSG91_AUTH_KEY and a DLT-approved
 * MSG91_TEMPLATE_ID — Indian carriers reject non-DLT-registered transactional
 * SMS by regulation, so the template must be registered in MSG91's DLT portal
 * before this can send anything for real. The template must contain a `##OTP##`
 * placeholder, per MSG91's convention.
 *
 * Docs: https://docs.msg91.com/reference/send-otp
 */
export const msg91OtpProvider: OtpProvider = {
  name: "msg91",
  async send({ phoneE164, code }) {
    const mobile = phoneE164.replace("+", "")
    const params = new URLSearchParams({
      template_id: env.MSG91_TEMPLATE_ID!,
      mobile,
      authkey: env.MSG91_AUTH_KEY!,
      otp: code,
      ...(env.MSG91_SENDER_ID ? { sender: env.MSG91_SENDER_ID } : {}),
    })

    try {
      const res = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
        method: "POST",
        headers: { authkey: env.MSG91_AUTH_KEY! },
      })
      const body = await res.json().catch(() => null)
      const delivered = res.ok && body?.type === "success"
      if (!delivered) {
        console.error("[otp:msg91] send failed:", res.status, body)
      }
      return { delivered, providerRef: body?.request_id }
    } catch (err) {
      console.error("[otp:msg91] request threw:", err)
      return { delivered: false }
    }
  },
}
