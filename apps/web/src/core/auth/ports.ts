/**
 * Genuinely swappable external dependency — Twilio for SMS in dev and prod,
 * console fallback when Twilio is not configured, without `otp.service.ts`
 * changing at all.
 */
export interface OtpProvider {
  readonly name: "console" | "twilio"
  send(input: { phoneE164: string; code: string }): Promise<{ delivered: boolean; providerRef?: string }>
}
