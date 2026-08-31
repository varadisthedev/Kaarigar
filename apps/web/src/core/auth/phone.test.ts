import { describe, it, expect } from "vitest"
import { isValidE164, normalizePhoneInput } from "./phone"

describe("normalizePhoneInput", () => {
  it("combines dial code and national number, stripping non-digits", () => {
    expect(normalizePhoneInput("+91", "98765 43210")).toBe("+919876543210")
    expect(normalizePhoneInput("91", "(987) 654-3210")).toBe("+919876543210")
  })
})

describe("isValidE164", () => {
  it("accepts a well-formed generic E.164 number", () => {
    expect(isValidE164("+14155552671")).toBe(true)
  })

  it("rejects numbers without a leading +", () => {
    expect(isValidE164("14155552671")).toBe(false)
  })

  it("rejects a number that is too short", () => {
    expect(isValidE164("+1234")).toBe(false)
  })

  it("applies the stricter 10-digit, 6-9-starting rule for +91 numbers", () => {
    expect(isValidE164("+919876543210")).toBe(true)
    expect(isValidE164("+915876543210")).toBe(false) // starts with 5
    expect(isValidE164("+91987654321")).toBe(false) // only 9 digits
    expect(isValidE164("+9198765432109")).toBe(false) // 11 digits
  })
})
