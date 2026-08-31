import "server-only"
import Razorpay from "razorpay"

import { env, features } from "@/config/env"
import { verifyHmacSignature } from "@/core/payments/webhook-signature"

let _client: Razorpay | null = null

function client(): Razorpay {
  if (!features.razorpay) {
    throw new Error(
      "Razorpay is not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local."
    )
  }
  if (!_client) {
    _client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! })
  }
  return _client
}

/** Amount in paise (Razorpay's smallest-unit convention) — callers pass
 * rupees, this converts. */
export async function createRazorpayOrder(input: {
  amountRupees: number
  receipt: string
}): Promise<{ id: string; amount: number; currency: string }> {
  const order = await client().orders.create({
    amount: Math.round(input.amountRupees * 100),
    currency: "INR",
    receipt: input.receipt,
  })
  return { id: order.id, amount: Number(order.amount), currency: order.currency }
}

/** Verifies the checkout-side signature (order_id|payment_id signed with the
 * key secret) — used when the client posts back after Razorpay Checkout
 * succeeds, as a fast client-side confirmation. The webhook (verified
 * separately below, with the webhook secret) remains the source of truth. */
export function verifyCheckoutSignature(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): boolean {
  if (!features.razorpay) return false
  return verifyHmacSignature(
    env.RAZORPAY_KEY_SECRET!,
    `${input.razorpayOrderId}|${input.razorpayPaymentId}`,
    input.razorpaySignature
  )
}

/** Verifies an inbound webhook payload against RAZORPAY_WEBHOOK_SECRET —
 * different secret from the checkout signature above, configured separately
 * in the Razorpay dashboard's webhook settings. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !env.RAZORPAY_WEBHOOK_SECRET) return false
  return verifyHmacSignature(env.RAZORPAY_WEBHOOK_SECRET, rawBody, signatureHeader)
}
