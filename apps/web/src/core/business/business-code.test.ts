import { describe, it, expect } from "vitest"
import { generateBusinessCode, stateCode, INDIAN_STATES } from "./business-code"

describe("stateCode", () => {
  it("maps known states case-insensitively", () => {
    expect(stateCode("Gujarat")).toBe("GJ")
    expect(stateCode("uttar pradesh")).toBe("UP")
    expect(stateCode("  Karnataka  ".trim())).toBe("KA")
  })

  it("falls back to IN for unknown or missing state", () => {
    expect(stateCode("Narnia")).toBe("IN")
    expect(stateCode(null)).toBe("IN")
    expect(stateCode(undefined)).toBe("IN")
  })
})

describe("generateBusinessCode", () => {
  it("produces the CM-<STATE>-<6 digits> shape", () => {
    const code = generateBusinessCode("Maharashtra")
    expect(code).toMatch(/^CM-MH-\d{6}$/)
  })

  it("uses IN for an unrecognized state", () => {
    expect(generateBusinessCode("Atlantis")).toMatch(/^CM-IN-\d{6}$/)
  })

  it("produces different codes across calls (random segment)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateBusinessCode("Bihar")))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe("INDIAN_STATES", () => {
  it("is proper-cased and non-empty", () => {
    expect(INDIAN_STATES.length).toBeGreaterThan(20)
    expect(INDIAN_STATES).toContain("Uttar Pradesh")
    expect(INDIAN_STATES).toContain("West Bengal")
  })
})
