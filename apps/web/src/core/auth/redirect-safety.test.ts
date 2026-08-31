import { describe, it, expect } from "vitest"
import { sanitizeRedirectPath } from "./redirect-safety"

describe("sanitizeRedirectPath", () => {
  it("accepts a normal relative path", () => {
    expect(sanitizeRedirectPath("/en/sell", "/en")).toBe("/en/sell")
  })

  it("accepts a relative path with a query string", () => {
    expect(sanitizeRedirectPath("/en/marketplace?category=Pottery", "/en")).toBe(
      "/en/marketplace?category=Pottery"
    )
  })

  it("falls back on null/undefined/empty", () => {
    expect(sanitizeRedirectPath(null, "/en")).toBe("/en")
    expect(sanitizeRedirectPath(undefined, "/en")).toBe("/en")
    expect(sanitizeRedirectPath("", "/en")).toBe("/en")
  })

  it("rejects an absolute URL to another origin", () => {
    expect(sanitizeRedirectPath("https://evil.com", "/en")).toBe("/en")
    expect(sanitizeRedirectPath("http://evil.com/phish", "/en")).toBe("/en")
  })

  it("rejects a protocol-relative URL (the classic open-redirect bypass)", () => {
    expect(sanitizeRedirectPath("//evil.com", "/en")).toBe("/en")
    expect(sanitizeRedirectPath("///evil.com", "/en")).toBe("/en")
  })

  it("rejects the backslash variant some browsers still normalize", () => {
    expect(sanitizeRedirectPath("/\\evil.com", "/en")).toBe("/en")
  })

  it("rejects a path with no leading slash", () => {
    expect(sanitizeRedirectPath("evil.com", "/en")).toBe("/en")
    expect(sanitizeRedirectPath("javascript:alert(1)", "/en")).toBe("/en")
  })
})
