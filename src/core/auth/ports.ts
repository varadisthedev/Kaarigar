/**
 * Genuinely swappable external dependency — MSG91 today, any other SMS
 * vendor later, without `otp.service.ts` changing at all.
 */
export interface OtpProvider {
  readonly name: "msg91" | "console"
  send(input: { phoneE164: string; code: string }): Promise<{ delivered: boolean; providerRef?: string }>
}
