import { describe, it, expect } from "vitest"
import { computeHmacSignature, verifyHmacSignature } from "./webhook-signature"

describe("webhook signature verification", () => {
  it("verifies a correctly signed payload", () => {
    const secret = "test-webhook-secret"
    const payload = JSON.stringify({ event: "payment.captured" })
    const signature = computeHmacSignature(secret, payload)
    expect(verifyHmacSignature(secret, payload, signature)).toBe(true)
  })

  it("rejects a payload signed with the wrong secret", () => {
    const payload = JSON.stringify({ event: "payment.captured" })
    const signature = computeHmacSignature("wrong-secret", payload)
    expect(verifyHmacSignature("test-webhook-secret", payload, signature)).toBe(false)
  })

  it("rejects a tampered payload even with a valid-looking signature", () => {
    const secret = "test-webhook-secret"
    const signature = computeHmacSignature(secret, JSON.stringify({ event: "payment.captured" }))
    const tamperedPayload = JSON.stringify({ event: "payment.captured", amount: 999999 })
    expect(verifyHmacSignature(secret, tamperedPayload, signature)).toBe(false)
  })

  it("rejects a garbage signature", () => {
    const secret = "test-webhook-secret"
    const payload = JSON.stringify({ event: "payment.captured" })
    expect(verifyHmacSignature(secret, payload, "not-a-real-signature")).toBe(false)
  })
})
