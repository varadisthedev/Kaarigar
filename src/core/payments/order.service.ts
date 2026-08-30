import "server-only"

import { env, features } from "@/config/env"
import { createRazorpayOrder } from "@/infra/payments/razorpay.client"
import { findInquiryById } from "@/infra/db/repositories/inquiries.repository"
import { createOrder, findOrderById, createPayment } from "@/infra/db/repositories/orders.repository"

export const DEFAULT_ADVANCE_PERCENT = 20
export const MIN_ADVANCE_PERCENT = 10
export const MAX_ADVANCE_PERCENT = 50

export type CreateOrderResult =
  | { ok: true; order: { id: string; totalAmount: string; advanceAmount: string; advancePercent: string } }
  | { ok: false; error: "not_found" | "forbidden" }

/** Buyer and seller have agreed on a total (in chat) — this records that
 * agreement as an order with a buyer-adjustable advance (20% suggested,
 * 10-50% range via the slider on the order dialog), before any payment is attempted. */
export async function createOrderFromInquiry(input: {
  inquiryId: string
  buyerId: string
  totalAmount: number
  advancePercent?: number
}): Promise<CreateOrderResult> {
  const inquiry = await findInquiryById(input.inquiryId)
  if (!inquiry) return { ok: false, error: "not_found" }
  if (inquiry.buyerId !== input.buyerId) return { ok: false, error: "forbidden" }

  const advancePercent = Math.min(
    MAX_ADVANCE_PERCENT,
    Math.max(MIN_ADVANCE_PERCENT, input.advancePercent ?? DEFAULT_ADVANCE_PERCENT)
  )
  const advanceAmount = Math.round(input.totalAmount * (advancePercent / 100) * 100) / 100

  const order = await createOrder({
    inquiryId: input.inquiryId,
    buyerId: input.buyerId,
    businessId: inquiry.businessId,
    totalAmount: String(input.totalAmount),
    advancePercent: String(advancePercent),
    advanceAmount: String(advanceAmount),
    status: "pending_advance",
  })

  return {
    ok: true,
    order: {
      id: order.id,
      totalAmount: order.totalAmount,
      advanceAmount: order.advanceAmount,
      advancePercent: order.advancePercent,
    },
  }
}

export type InitiatePaymentResult =
  | { ok: true; razorpayOrderId: string; amount: number; currency: string; keyId: string }
  | { ok: false; error: "not_found" | "forbidden" | "not_configured" | "invalid_state" }

export async function initiateAdvancePayment(input: {
  orderId: string
  buyerId: string
}): Promise<InitiatePaymentResult> {
  if (!features.razorpay) return { ok: false, error: "not_configured" }

  const order = await findOrderById(input.orderId)
  if (!order) return { ok: false, error: "not_found" }
  if (order.buyerId !== input.buyerId) return { ok: false, error: "forbidden" }
  if (order.status !== "pending_advance") return { ok: false, error: "invalid_state" }

  const razorpayOrder = await createRazorpayOrder({
    amountRupees: Number(order.advanceAmount),
    receipt: `Kaarigar_order_${order.id}`,
  })

  await createPayment({
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    amount: order.advanceAmount,
    currency: razorpayOrder.currency,
    status: "created",
  })

  return {
    ok: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: env.RAZORPAY_KEY_ID!,
  }
}
