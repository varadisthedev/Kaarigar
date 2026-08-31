import "server-only"
import type { OtpProvider } from "@/core/auth/ports"

/**
 * Dev fallback with no account needed — prints the OTP to the server log
 * instead of sending an SMS, so the entire auth flow is testable today.
 * Selected automatically whenever MSG91 isn't configured (see `./index.ts`).
 */
export const consoleOtpProvider: OtpProvider = {
  name: "console",
  async send({ phoneE164, code }) {
    console.log(`\n[otp:console] ${phoneE164} -> ${code}\n`)
    return { delivered: true, providerRef: "console" }
  },
}
