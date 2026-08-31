import { NextResponse, type NextRequest } from "next/server"

import { verifyWebhookSignature } from "@/infra/payments/razorpay.client"
import { markPaymentCaptured } from "@/infra/db/repositories/orders.repository"

/**
 * Razorpay webhook — the source of truth for payment status (the client-side
 * checkout callback is just an optimistic UI update). Verifies the HMAC
 * signature over the *raw* body with RAZORPAY_WEBHOOK_SECRET (configured
 * separately from the API key/secret, in the Razorpay dashboard's webhook
 * settings), and is idempotent on razorpay_order_id so a redelivered event
 * doesn't double-process.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity
    if (payment?.order_id && payment?.id) {
      await markPaymentCaptured(payment.order_id, payment.id, signature ?? "", event)
    }
  }

  return NextResponse.json({ ok: true })
}
