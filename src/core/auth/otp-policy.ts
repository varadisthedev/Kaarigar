/**
 * Pure decision rules pulled out of `otp.service.ts` so the attempt/expiry
 * policy is unit-testable without a database — this is exactly the kind of
 * silent-bug-is-expensive logic (lock an artisan out, or fail to lock a
 * brute-forcer out) worth covering directly.
 */

export function isOtpExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() < now.getTime()
}

export function hasExceededAttempts(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts
}
