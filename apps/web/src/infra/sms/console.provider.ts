import "server-only"
import type { OtpProvider } from "@/core/auth/ports"

/** Dev/default OTP delivery — logs to server console and exposes the code on-page via devCode. */
export const consoleOtpProvider: OtpProvider = {
  name: "console",
  async send({ phoneE164, code }) {
    console.log(`[otp:console] ${phoneE164} → ${code}`)
    return { delivered: true }
  },
}
