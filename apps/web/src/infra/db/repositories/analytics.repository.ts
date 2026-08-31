import "server-only"
import { and, eq, gte, inArray, sql } from "drizzle-orm"

import { getDb } from "../client"
import { businesses, products, productViewsDaily, orders, payments } from "../schema"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Upserts today's per-product view counter — called alongside the lifetime
 * `products.viewCount` bump so both stay in sync from one call site. */
export async function recordProductView(productId: string, businessId: string) {
  const db = getDb()
  await db
    .insert(productViewsDaily)
    .values({ productId, businessId, date: todayIso(), viewCount: 1 })
    .onConflictDoUpdate({
      target: [productViewsDaily.productId, productViewsDaily.date],
      set: { viewCount: sql`${productViewsDaily.viewCount} + 1` },
    })
}

async function ownedBusinessIds(sellerId: string): Promise<string[]> {
  const db = getDb()
  const owned = await db.query.businesses.findMany({
    where: eq(businesses.ownerId, sellerId),
    columns: { id: true },
  })
  return owned.map((b) => b.id)
}

export type DailyViewTotal = { date: string; total: number }

/** Total views per day (all of the seller's products combined) — the line
 * chart's Y values. */
export async function getDailyViewsForSeller(sellerId: string, days = 30): Promise<DailyViewTotal[]> {
  const ownedIds = await ownedBusinessIds(sellerId)
  if (ownedIds.length === 0) return []

  const db = getDb()
  const rows = await db
    .select({ date: productViewsDaily.date, total: sql<number>`sum(${productViewsDaily.viewCount})::int` })
    .from(productViewsDaily)
    .where(and(inArray(productViewsDaily.businessId, ownedIds), gte(productViewsDaily.date, daysAgoIso(days))))
    .groupBy(productViewsDaily.date)
    .orderBy(productViewsDaily.date)

  return rows
}

export type DailyViewByProduct = { date: string; productId: string; productTitle: string; views: number }

/** Per-product breakdown for each day — feeds the line chart's hover
 * tooltip ("Blue Pottery Vase: 12 views" etc). */
export async function getDailyViewsByProductForSeller(sellerId: string, days = 30): Promise<DailyViewByProduct[]> {
  const ownedIds = await ownedBusinessIds(sellerId)
  if (ownedIds.length === 0) return []

  const db = getDb()
  const rows = await db
    .select({
      date: productViewsDaily.date,
      productId: productViewsDaily.productId,
      productTitle: products.titleEn,
      views: productViewsDaily.viewCount,
    })
    .from(productViewsDaily)
    .innerJoin(products, eq(products.id, productViewsDaily.productId))
    .where(and(inArray(productViewsDaily.businessId, ownedIds), gte(productViewsDaily.date, daysAgoIso(days))))
    .orderBy(productViewsDaily.date)

  return rows
}

export type MonthlyPaymentSummary = {
  advanceReceived: number
  remainingOrderValue: number
}

/** This calendar month's Razorpay-backed order economics for the seller —
 * `payments`/`orders` are already populated locally via the webhook, so no
 * live Razorpay API call is needed for reporting.
 *
 * Scoped by when the payment was actually *captured* (not when the order
 * was created) — an order opened in one month whose advance clears in the
 * next should count toward the month the money actually landed. Each
 * qualifying order then also contributes its outstanding balance to
 * `remainingOrderValue`, so the pie always reflects "money in vs. money
 * still owed" for this month's paid deals. */
export async function getMonthlyPaymentSummaryForSeller(sellerId: string): Promise<MonthlyPaymentSummary> {
  const ownedIds = await ownedBusinessIds(sellerId)
  if (ownedIds.length === 0) return { advanceReceived: 0, remainingOrderValue: 0 }

  const db = getDb()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const paidThisMonth = await db
    .select({ orderId: payments.orderId, amount: payments.amount })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(
      and(
        inArray(orders.businessId, ownedIds),
        eq(payments.status, "paid"),
        gte(payments.updatedAt, monthStart)
      )
    )

  if (paidThisMonth.length === 0) return { advanceReceived: 0, remainingOrderValue: 0 }

  const advanceReceived = paidThisMonth.reduce((sum, p) => sum + Number(p.amount), 0)

  const orderIds = [...new Set(paidThisMonth.map((p) => p.orderId))]
  const relatedOrders = await db.query.orders.findMany({
    where: inArray(orders.id, orderIds),
    with: { payments: true },
  })

  let remainingOrderValue = 0
  for (const order of relatedOrders) {
    if (order.status === "cancelled") continue
    const totalPaid = order.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0)
    remainingOrderValue += Math.max(0, Number(order.totalAmount) - totalPaid)
  }

  return { advanceReceived, remainingOrderValue }
}

export async function getMonthlyIncomeTarget(businessId: string): Promise<number | null> {
  const db = getDb()
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    columns: { monthlyIncomeTarget: true },
  })
  return business?.monthlyIncomeTarget ? Number(business.monthlyIncomeTarget) : null
}

export async function setMonthlyIncomeTarget(businessId: string, amount: number): Promise<void> {
  const db = getDb()
  await db.update(businesses).set({ monthlyIncomeTarget: String(amount) }).where(eq(businesses.id, businessId))
}
