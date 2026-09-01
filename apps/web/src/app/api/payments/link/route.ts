import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { env, features } from "@/config/env"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { findInquiryById } from "@/infra/db/repositories/inquiries.repository"
import { createOrder, createPayment } from "@/infra/db/repositories/orders.repository"
import { createMessage } from "@/infra/db/repositories/messages.repository"
import { createRazorpayOrder } from "@/infra/payments/razorpay.client"
import { notifyNewMessage } from "@/infra/messaging/pusher-server"

const bodySchema = z.object({
  inquiryId: z.string().uuid(),
  amount: z.number().positive().min(1),
  description: z.string().max(200).optional(),
})

// Maximum Razorpay Link Expiry: 30 days in seconds
const MAX_EXPIRY_SECONDS = 30 * 24 * 60 * 60

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const inquiry = await findInquiryById(parsed.data.inquiryId)
  if (!inquiry) return NextResponse.json({ error: "inquiry_not_found" }, { status: 404 })

  const isOwner = inquiry.business.ownerId === user.sub
  const isBuyer = inquiry.buyerId === user.sub
  if (!isOwner && !isBuyer) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const amount = parsed.data.amount
  const desc = parsed.data.description || `Payment for order ${inquiry.business.displayName}`

  // Create or associate Order
  const order = await createOrder({
    inquiryId: inquiry.id,
    buyerId: inquiry.buyerId,
    businessId: inquiry.businessId,
    totalAmount: String(amount),
    advancePercent: "100",
    advanceAmount: String(amount),
    status: "pending_advance",
  })

  let razorpayOrderId = `rpay_order_${order.id}`
  let paymentLinkUrl: string | undefined

  if (features.razorpay) {
    try {
      const rpayOrder = await createRazorpayOrder({
        amountRupees: amount,
        receipt: `kaarigar_${order.id.slice(0, 16)}`,
      })
      razorpayOrderId = rpayOrder.id

      await createPayment({
        orderId: order.id,
        razorpayOrderId: rpayOrder.id,
        amount: String(amount),
        currency: "INR",
        status: "created",
      })
    } catch (e) {
      console.warn("[payment/link] Razorpay order creation failed, creating local order link:", e)
    }
  }

  // Send interactive payment link card message into chat thread
  const paymentMessage = `[PAYMENT_LINK:${amount}:${order.id}:${encodeURIComponent(desc)}]`
  const message = await createMessage({
    inquiryId: inquiry.id,
    senderId: user.sub,
    body: paymentMessage,
  })
  await notifyNewMessage(inquiry.id, message)

  const expireAt = new Date(Date.now() + MAX_EXPIRY_SECONDS * 1000).toISOString()

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    amount,
    razorpayOrderId,
    keyId: env.RAZORPAY_KEY_ID || "",
    expireAt,
  })
}
