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

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export type RequestOtpResult =
  | { ok: true; devCode?: string }
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

  const rateLimit = await checkOtpRequestRateLimit(input.phoneE164, input.ip)
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
    return { ok: false, error: "send_failed" }
  }

  return provider.name === "console" ? { ok: true, devCode: code } : { ok: true }
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
  if (hasExceededAttempts(challenge.attempts, challenge.maxAttempts)) {
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
