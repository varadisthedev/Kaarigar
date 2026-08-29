import { hash, verify } from "@node-rs/argon2"

// @node-rs/argon2's `Algorithm` is a `const enum`, which can't be imported
// under isolatedModules (required by Next.js's SWC/Turbopack build) — so the
// value it compiles to (Argon2id = 2) is inlined directly instead.
const ARGON2ID = 2

/** OTP codes are hashed at rest exactly like a password would be — argon2id,
 * explicit (not relying on the library default), constant-time verify. */
export async function hashOtpCode(code: string): Promise<string> {
  return hash(code, { algorithm: ARGON2ID })
}

export async function verifyOtpCode(codeHash: string, candidate: string): Promise<boolean> {
  return verify(codeHash, candidate)
}
