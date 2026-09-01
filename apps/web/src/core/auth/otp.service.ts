import "server-only"
import { randomInt } from "node:crypto"

import { isValidE164 } from "./phone"
import { hashOtpCode, verifyOtpCode } from "./otp-hash"
import { hasExceededAttempts } from "./otp-policy"
import { env } from "@/config/env"
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

  // MVP diagnostic: this is emitted to the server/function log only, never
  // returned by the API. Remove the code from this line before public launch.
  console.info(
    `[otp] ${input.phoneE164} (${input.purpose}) -> ${code} ` +
      `(delivered=${result.delivered}, provider=${provider.name})`
  )

  if (!result.delivered) {
    // A challenge may be stored before delivery so its code can be verified only
    // after a successful resend. Never claim success or reveal it to a client
    // when the provider rejected the message.
    console.error(
      `[otp] delivery failed for ${input.phoneE164} (${input.purpose}, provider=${provider.name})`,
      result.providerRef
    )
    return { ok: false, error: "send_failed" }
  }

  // The console provider is deliberately a local-development convenience.
  // Do not return authentication codes from a deployed environment.
  if (provider.name === "console" && env.NODE_ENV !== "production") {
    return { ok: true, devCode: code }
  }

  return { ok: true }
}

export type VerifyOtpResult =
  | { ok: true; challengeId: string }
  | { ok: false; error: "expired_or_not_found" }
  | { ok: false; error: "too_many_attempts" }
  | { ok: false; error: "invalid_code" }

function normalizeOtpCode(code: string): string {
  const digits = code.replace(/\D/g, "")
  if (digits.length === 0 || digits.length > 6) return code.trim()
  return digits.padStart(6, "0")
}

export async function verifyOtp(input: {
  phoneE164: string
  purpose: NewOtpChallenge["purpose"]
  code: string
}): Promise<VerifyOtpResult> {
  const code = normalizeOtpCode(input.code)
  const challenge = await findActiveOtpChallenge(input.phoneE164, input.purpose)
  if (!challenge) {
    return { ok: false, error: "expired_or_not_found" }
  }
  if (input.purpose !== "login" && hasExceededAttempts(challenge.attempts, challenge.maxAttempts)) {
    return { ok: false, error: "too_many_attempts" }
  }

  let valid = false
  try {
    valid = await verifyOtpCode(challenge.codeHash, code)
  } catch (err) {
    console.error("[otp] verify hash threw:", err)
    return { ok: false, error: "invalid_code" }
  }

  if (!valid) {
    await incrementOtpAttempts(challenge.id)
    return { ok: false, error: "invalid_code" }
  }

  // Consumed only after session is issued — see otp/verify route.
  return { ok: true, challengeId: challenge.id }
}

export async function finalizeOtpChallenge(challengeId: string): Promise<void> {
  await consumeOtpChallenge(challengeId)
}
