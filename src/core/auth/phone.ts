/**
 * Deliberately simple phone handling — no libphonenumber dependency. Generic
 * E.164 shape validation for any country, plus a stricter check for India
 * (+91) since that's the primary market: exactly 10 digits, starting 6-9.
 */

const E164_RE = /^\+[1-9]\d{7,14}$/
const INDIA_MOBILE_RE = /^\+91[6-9]\d{9}$/

export function normalizePhoneInput(dialCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "")
  const code = dialCode.startsWith("+") ? dialCode : `+${dialCode}`
  return `${code}${digits}`
}

export function isValidE164(phoneE164: string): boolean {
  if (!E164_RE.test(phoneE164)) return false
  if (phoneE164.startsWith("+91")) return INDIA_MOBILE_RE.test(phoneE164)
  return true
}
