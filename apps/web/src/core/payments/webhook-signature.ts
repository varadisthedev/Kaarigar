import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Pure HMAC-SHA256 sign/verify — no env, no `server-only` import, so this is
 * directly unit-testable. `infra/payments/razorpay.client.ts` is the only
 * caller and supplies the secret from `env`; kept separate so the crypto
 * logic itself (the part a signature-verification bug would actually break)
 * is covered without needing real Razorpay credentials.
 */

export function computeHmacSignature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export function verifyHmacSignature(secret: string, payload: string, signature: string): boolean {
  const expected = computeHmacSignature(secret, payload)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
