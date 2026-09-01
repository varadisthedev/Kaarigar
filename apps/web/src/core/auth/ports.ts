/**
 * Genuinely swappable external dependency — Renflair WhatsApp OTP (primary),
 * Twilio SMS (optional), console fallback when neither is configured.
 */
export interface OtpProvider {
  readonly name: "console" | "renflair" | "twilio"
  send(input: { phoneE164: string; code: string }): Promise<{ delivered: boolean; providerRef?: string }>
}
