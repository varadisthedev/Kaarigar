import { describe, it, expect } from "vitest"
import { signAccessToken, verifyAccessToken } from "./jwt"

describe("signAccessToken / verifyAccessToken", () => {
  it("round-trips a valid token", async () => {
    const token = await signAccessToken({ sub: "user-1", phone: "+919876543210", role: "artisan" })
    const payload = await verifyAccessToken(token)
    expect(payload).toEqual({ sub: "user-1", phone: "+919876543210", role: "artisan" })
  })

  it("rejects a tampered token", async () => {
    const token = await signAccessToken({ sub: "user-1", phone: "+919876543210", role: "artisan" })
    const tampered = token.slice(0, -2) + (token.at(-2) === "a" ? "b" : "a") + token.at(-1)
    expect(await verifyAccessToken(tampered)).toBeNull()
  })

  it("rejects a completely malformed token", async () => {
    expect(await verifyAccessToken("not-a-jwt")).toBeNull()
  })

  it("rejects an empty string", async () => {
    expect(await verifyAccessToken("")).toBeNull()
  })
})
