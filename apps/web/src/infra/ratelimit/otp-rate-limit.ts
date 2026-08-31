import "server-only"

import {
  countRecentOtpChallenges,
  countRecentOtpChallengesByIp,
} from "@/infra/db/repositories/otp.repository"

const PHONE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const PHONE_MAX_REQUESTS = 5
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_MAX_REQUESTS = 15

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/**
 * DB-backed sliding window over `otp_challenges` rows already being written —
 * no separate rate-limit table or service needed. Scoped to both the phone
 * number (stop one number being hammered) and the IP (stop one client
 * spraying requests across many numbers).
 */
export async function checkOtpRequestRateLimit(
  phoneE164: string,
  ip: string | null
): Promise<RateLimitResult> {
  const now = Date.now()

  const phoneCount = await countRecentOtpChallenges(phoneE164, now - PHONE_WINDOW_MS)
  if (phoneCount >= PHONE_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil(PHONE_WINDOW_MS / 1000) }
  }

  if (ip) {
    const ipCount = await countRecentOtpChallengesByIp(ip, now - IP_WINDOW_MS)
    if (ipCount >= IP_MAX_REQUESTS) {
      return { allowed: false, retryAfterSeconds: Math.ceil(IP_WINDOW_MS / 1000) }
    }
  }

  return { allowed: true }
}
