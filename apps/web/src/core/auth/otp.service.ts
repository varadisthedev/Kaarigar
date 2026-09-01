import "server-only"
import { randomInt } from "node:crypto"

import { isValidE164 } from "./phone"
import { hashOtpCode, verifyOtpCode } from "./otp-hash"
import { hasExceededAttempts } from "./otp-policy"
import { getOtpProvider } from "@/infra/sms"
import { checkOtpRequestRateLimit } from "@/infra/ratelimit/otp-rate-limit"
import {
  createOtpChallenge,
  findActiveOtpChallenge,
  incrementOtpAttempts,
  consumeOtpChallenge,
} from "@/infra/db/repositories/otp.repository"
import type { NewOtpChallenge } from "@/infra/db/schema"

const OTP_TTL_MS = 20 * 60 * 1000
const MAX_ATTEMPTS = 5

export type RequestOtpResult =
  | { ok: true; devCode?: string; smsFailed?: boolean }
  | { ok: false; error: "invalid_phone" }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number }
  | { ok: false; error: "send_failed" }

export async function requestOtp(input: {
  phoneE164: string
  purpose: NewOtpChallenge["purpose"]
  ip: string | null
}): Promise<RequestOtpResult> {
  if (!isValidE164(input.phoneE164)) {
    return { ok: false, error: "invalid_phone" }
  }

  const rateLimit =
    input.purpose === "login"
      ? ({ allowed: true } as const)
      : await checkOtpRequestRateLimit(input.phoneE164, input.ip)
  if (!rateLimit.allowed) {
    return { ok: false, error: "rate_limited", retryAfterSeconds: rateLimit.retryAfterSeconds }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0")
  const codeHash = await hashOtpCode(code)

  await createOtpChallenge({
    phoneE164: input.phoneE164,
    purpose: input.purpose,
    codeHash,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    ip: input.ip ?? undefined,
  })

  const provider = getOtpProvider()
  const result = await provider.send({ phoneE164: input.phoneE164, code })
  if (!result.delivered) {
    // Login fallback: show OTP on the page when SMS fails (Twilio trial/India geo, etc.)
    if (input.purpose === "login") {
      console.warn("[otp] OTP delivery failed — exposing code on login page as fallback", result.providerRef)
      return { ok: true, devCode: code, smsFailed: true }
    }
    return { ok: false, error: "send_failed" }
  }

  // Console provider: show OTP on the login/onboarding page instead of SMS.
  if (provider.name === "console") {
    return { ok: true, devCode: code }
  }

  return { ok: true }
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: "expired_or_not_found" }
  | { ok: false; error: "too_many_attempts" }
  | { ok: false; error: "invalid_code" }

export async function verifyOtp(input: {
  phoneE164: string
  purpose: NewOtpChallenge["purpose"]
  code: string
}): Promise<VerifyOtpResult> {
  const challenge = await findActiveOtpChallenge(input.phoneE164, input.purpose)
  if (!challenge) {
    return { ok: false, error: "expired_or_not_found" }
  }
  if (input.purpose !== "login" && hasExceededAttempts(challenge.attempts, challenge.maxAttempts)) {
    return { ok: false, error: "too_many_attempts" }
  }

  const valid = await verifyOtpCode(challenge.codeHash, input.code)
  if (!valid) {
    await incrementOtpAttempts(challenge.id)
    return { ok: false, error: "invalid_code" }
  }

  await consumeOtpChallenge(challenge.id)
  return { ok: true }
}
