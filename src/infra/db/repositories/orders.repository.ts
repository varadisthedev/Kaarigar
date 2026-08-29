import "server-only"
import { eq } from "drizzle-orm"

import { getDb } from "../client"
import { orders, payments, type NewOrder, type NewPayment } from "../schema"

export async function createOrder(input: NewOrder) {
  const db = getDb()
  const [order] = await db.insert(orders).values(input).returning()
  return order
}

export async function findOrderById(id: string) {
  const db = getDb()
  return db.query.orders.findFirst({ where: eq(orders.id, id), with: { business: true, buyer: true } })
}

export async function createPayment(input: NewPayment) {
  const db = getDb()
  const [payment] = await db.insert(payments).values(input).returning()
  return payment
}

export async function findPaymentByRazorpayOrderId(razorpayOrderId: string) {
  const db = getDb()
  return db.query.payments.findFirst({ where: eq(payments.razorpayOrderId, razorpayOrderId) })
}

export async function markPaymentCaptured(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  rawPayload: unknown
) {
  const db = getDb()
  const payment = await findPaymentByRazorpayOrderId(razorpayOrderId)
  if (!payment) return null
  if (payment.status === "paid") return payment // idempotent — webhook can retry/duplicate-deliver

  const [updated] = await db
    .update(payments)
    .set({ status: "paid", razorpayPaymentId, razorpaySignature, rawPayload, updatedAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning()

  await db.update(orders).set({ status: "advance_paid", updatedAt: new Date() }).where(eq(orders.id, payment.orderId))

  return updated
}
