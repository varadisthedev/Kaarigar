import { describe, it, expect } from "vitest"
import { isOtpExpired, hasExceededAttempts } from "./otp-policy"

describe("isOtpExpired", () => {
  it("is expired once expiresAt is in the past", () => {
    const now = new Date("2026-01-01T00:10:00Z")
    expect(isOtpExpired(new Date("2026-01-01T00:09:59Z"), now)).toBe(true)
  })

  it("is not expired while expiresAt is still in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z")
    expect(isOtpExpired(new Date("2026-01-01T00:09:59Z"), now)).toBe(false)
  })

  it("treats the exact expiry instant as not-yet-expired", () => {
    const now = new Date("2026-01-01T00:10:00Z")
    expect(isOtpExpired(new Date("2026-01-01T00:10:00Z"), now)).toBe(false)
  })
})

describe("hasExceededAttempts", () => {
  it("allows attempts strictly below the max", () => {
    expect(hasExceededAttempts(4, 5)).toBe(false)
  })

  it("blocks once attempts reach the max", () => {
    expect(hasExceededAttempts(5, 5)).toBe(true)
  })

  it("blocks attempts beyond the max (e.g. a race already incremented past it)", () => {
    expect(hasExceededAttempts(6, 5)).toBe(true)
  })
})
