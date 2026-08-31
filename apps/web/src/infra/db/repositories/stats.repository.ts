import "server-only"
import { eq, sql } from "drizzle-orm"

import { getDb } from "../client"
import { users, products, businesses, orders, productViewsDaily, productLikes, inquiries } from "../schema"

/** Real platform-wide counts for the home page's stats strip — every
 * number here is a live aggregate, never a hardcoded/marketing figure. A
 * fresh install legitimately shows small or zero numbers. */
export async function getPlatformStats() {
  const db = getDb()

  const [buyerRows, productRows, dealRows, stateRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "buyer")),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.status, "published")),
    db
      .select({ count: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${orders.totalAmount}), 0)` })
      .from(orders)
      .where(eq(orders.status, "completed")),
    db
      .select({ count: sql<number>`count(distinct ${businesses.state})::int` })
      .from(businesses)
      .where(eq(businesses.status, "approved")),
  ])

  return {
    activeBuyers: buyerRows[0]?.count ?? 0,
    productsListed: productRows[0]?.count ?? 0,
    dealsCompleted: dealRows[0]?.count ?? 0,
    dealsTotalAmount: Number(dealRows[0]?.total ?? 0),
    statesConnected: stateRows[0]?.count ?? 0,
  }
}

/** The most-listed craft category among live, approved businesses — a
 * genuine query result used to power the "today's insight" card, not a
 * canned line. Returns null when there isn't enough data to say anything. */
export async function getTopCraftCategoryInsight(): Promise<{ category: string; state: string | null; count: number } | null> {
  const db = getDb()
  const rows = await db.execute<{ craft_category: string; state: string | null; count: number }>(sql`
    select craft_category, state, count(*)::int as count
    from businesses
    where status = 'approved'
    group by craft_category, state
    order by count desc, craft_category asc
    limit 1
  `)
  const row = rows.rows[0]
  if (!row || row.count < 1) return null
  return { category: row.craft_category, state: row.state, count: row.count }
}

/** Real tag frequency across published listings — powers the "trending"
 * chip cloud from actual inventory rather than search telemetry we don't
 * collect. */
export async function getPopularProductTags(limit = 6): Promise<string[]> {
  const db = getDb()
  const rows = await db.execute<{ tag: string; count: number }>(sql`
    select tag, count(*)::int as count
    from ${products}, unnest(${products.seoKeywords}) as tag
    where ${products.status} = 'published'
    group by tag
    order by count desc, tag asc
    limit ${limit}
  `)
  return rows.rows.map((r) => r.tag)
}

/** Real last-7-days activity for one seller's business — powers the home
 * page's "Business Assistant" card. Every number is a live aggregate:
 * daily view counters, actual inquiry rows, actual like rows — never a
 * canned figure. */
export async function getBusinessWeeklyInsight(
  businessId: string
): Promise<{ views: number; inquiries: number; shortlisted: number }> {
  const db = getDb()
  const since = sql`now() - interval '7 days'`

  const [viewRows, inquiryRows, likeRows] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${productViewsDaily.viewCount}), 0)::int` })
      .from(productViewsDaily)
      .where(sql`${productViewsDaily.businessId} = ${businessId} and ${productViewsDaily.date} >= (${since})::date`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(sql`${inquiries.businessId} = ${businessId} and ${inquiries.createdAt} >= ${since}`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(productLikes)
      .innerJoin(products, eq(productLikes.productId, products.id))
      .where(sql`${products.businessId} = ${businessId} and ${productLikes.createdAt} >= ${since}`),
  ])

  return {
    views: viewRows[0]?.total ?? 0,
    inquiries: inquiryRows[0]?.count ?? 0,
    shortlisted: likeRows[0]?.count ?? 0,
  }
}
