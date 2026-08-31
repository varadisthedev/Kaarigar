import "server-only"
import { and, or, desc, eq, ilike, gte, lte, inArray, sql } from "drizzle-orm"

import { getDb } from "../client"
import {
  businesses,
  businessMedia,
  products,
  productMedia,
  productLikes,
  inquiries,
  type NewBusiness,
  type NewBusinessMedia,
  type NewProduct,
  type NewProductMedia,
} from "../schema"
import { recordProductView } from "./analytics.repository"

export async function createBusiness(input: NewBusiness) {
  const db = getDb()
  const [business] = await db.insert(businesses).values(input).returning()
  return business
}

export async function addBusinessMedia(input: NewBusinessMedia) {
  const db = getDb()
  const [media] = await db.insert(businessMedia).values(input).returning()
  return media
}

export async function createProduct(input: NewProduct) {
  const db = getDb()
  const [product] = await db.insert(products).values(input).returning()
  return product
}

export async function addProductMedia(input: NewProductMedia) {
  const db = getDb()
  const [media] = await db.insert(productMedia).values(input).returning()
  return media
}

export async function slugExists(slug: string): Promise<boolean> {
  const db = getDb()
  const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) })
  return Boolean(existing)
}

export async function findBusinessById(id: string) {
  const db = getDb()
  return db.query.businesses.findFirst({ where: eq(businesses.id, id) })
}

export async function findBusinessByCode(businessCode: string) {
  const db = getDb()
  return db.query.businesses.findFirst({
    where: eq(businesses.businessCode, businessCode),
    with: { media: true, products: { with: { media: true } } },
  })
}

export async function findBusinessesByOwner(ownerId: string) {
  const db = getDb()
  return db.query.businesses.findMany({
    where: eq(businesses.ownerId, ownerId),
    orderBy: desc(businesses.createdAt),
  })
}

/** Every product across every business the given user owns — the seller
 * dashboard's "My Catalog" and "Your Products" views. */
export type ProductSort = "newest" | "oldest" | "priceAsc" | "priceDesc" | "views" | "likes"

export async function findProductsForOwner(ownerId: string, opts?: { q?: string; sort?: ProductSort }) {
  const db = getDb()
  const owned = await db.query.businesses.findMany({
    where: eq(businesses.ownerId, ownerId),
    columns: { id: true },
  })
  if (owned.length === 0) return []

  const ownedIds = owned.map((b) => b.id)
  const q = opts?.q?.trim()

  const orderBy = {
    newest: desc(products.createdAt),
    oldest: products.createdAt,
    priceAsc: products.priceMin,
    priceDesc: desc(products.priceMin),
    views: desc(products.viewCount),
    likes: desc(products.likeCount),
  }[opts?.sort ?? "newest"]

  return db.query.products.findMany({
    where: and(
      inArray(products.businessId, ownedIds),
      q ? or(ilike(products.titleEn, `%${q}%`), ilike(products.titleHi, `%${q}%`)) : undefined
    ),
    orderBy,
    with: { media: true, business: true },
  })
}

export async function listPendingReviewBusinesses() {
  const db = getDb()
  return db.query.businesses.findMany({
    where: eq(businesses.status, "pending_review"),
    orderBy: businesses.submittedAt,
    with: { media: true, products: { with: { media: true } } },
  })
}

export async function approveBusiness(id: string, businessCode: string, reviewedBy: string | null) {
  const db = getDb()
  const [business] = await db
    .update(businesses)
    .set({ status: "approved", businessCode, reviewedAt: new Date(), reviewedBy, updatedAt: new Date() })
    .where(eq(businesses.id, id))
    .returning()

  // Publish every draft product that came in with the submission.
  await db.update(products).set({ status: "published" }).where(eq(products.businessId, id))

  return business
}

export async function rejectBusiness(id: string, reason: string, reviewedBy: string) {
  const db = getDb()
  const [business] = await db
    .update(businesses)
    .set({ status: "rejected", rejectionReason: reason, reviewedAt: new Date(), reviewedBy, updatedAt: new Date() })
    .where(eq(businesses.id, id))
    .returning()
  return business
}

export type MarketplaceFilters = {
  search?: string
  category?: string
  state?: string
  priceMin?: number
  priceMax?: number
  moqMax?: number
}

/** Public marketplace listing — approved businesses joined to their
 * published products, with the filter set the marketplace page exposes. */
export async function listMarketplaceBusinesses(filters: MarketplaceFilters = {}) {
  const db = getDb()
  const conditions = [eq(businesses.status, "approved")]

  if (filters.category) conditions.push(eq(businesses.craftCategory, filters.category))
  if (filters.state) conditions.push(eq(businesses.state, filters.state))
  if (filters.search) {
    const term = `%${filters.search}%`
    // A standalone query (not a raw exists-subquery in the same call) —
    // `products` is also reached below via `with: { products: ... }`, and
    // Drizzle's relational query builder mis-aliases a second bare
    // reference to the same table inside a raw `sql` fragment in that case.
    const matches = await db.query.products.findMany({
      where: and(eq(products.status, "published"), ilike(products.titleEn, term)),
      columns: { businessId: true },
    })
    const matchingBusinessIds = matches.map((m) => m.businessId)
    conditions.push(
      matchingBusinessIds.length > 0
        ? or(ilike(businesses.displayName, term), inArray(businesses.id, matchingBusinessIds))!
        : ilike(businesses.displayName, term)
    )
  }

  return db.query.businesses.findMany({
    where: and(...conditions),
    orderBy: desc(businesses.reviewedAt),
    with: {
      media: true,
      products: {
        where: and(
          eq(products.status, "published"),
          filters.priceMin != null ? gte(products.priceMin, String(filters.priceMin)) : undefined,
          filters.priceMax != null ? lte(products.priceMax, String(filters.priceMax)) : undefined,
          filters.moqMax != null ? lte(products.moq, filters.moqMax) : undefined
        ),
        with: { media: true },
      },
    },
  })
}

export async function findProductBySlug(slug: string) {
  const db = getDb()
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { media: true, business: true },
  })
}

/** Ownership checks (edit, like) need the owning business without pulling
 * every sibling product/media the way `findBusinessesByOwner` etc. do. */
export async function findProductById(id: string) {
  const db = getDb()
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: { media: true, business: true },
  })
}

export async function updateProduct(
  id: string,
  patch: Partial<
    Pick<
      NewProduct,
      "titleEn" | "titleHi" | "descriptionEn" | "descriptionHi" | "materials" | "dimensions" | "priceMin" | "priceMax" | "seoKeywords"
    >
  >
) {
  const db = getDb()
  const [product] = await db
    .update(products)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()
  return product
}

export async function incrementProductViewCount(id: string) {
  const db = getDb()
  const [product] = await db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, id))
    .returning({ businessId: products.businessId })
  if (product) await recordProductView(id, product.businessId)
}

/** Idempotent per user — inserts/deletes the `product_likes` row and keeps
 * the denormalized `likeCount` on `products` in sync in the same call. */
export async function toggleProductLike(productId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  const db = getDb()
  const existing = await db.query.productLikes.findFirst({
    where: and(eq(productLikes.productId, productId), eq(productLikes.userId, userId)),
  })

  if (existing) {
    await db.delete(productLikes).where(eq(productLikes.id, existing.id))
    const [product] = await db
      .update(products)
      .set({ likeCount: sql`greatest(${products.likeCount} - 1, 0)` })
      .where(eq(products.id, productId))
      .returning({ likeCount: products.likeCount })
    return { liked: false, likeCount: product?.likeCount ?? 0 }
  }

  await db.insert(productLikes).values({ productId, userId })
  const [product] = await db
    .update(products)
    .set({ likeCount: sql`${products.likeCount} + 1` })
    .where(eq(products.id, productId))
    .returning({ likeCount: products.likeCount })
  return { liked: true, likeCount: product?.likeCount ?? 0 }
}

/** Batched like-state lookup for a list of cards (the home feed, catalog
 * pages) — one query instead of one `hasUserLikedProduct` call per card. */
export async function getLikedProductIds(userId: string, productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set()
  const db = getDb()
  const rows = await db.query.productLikes.findMany({
    where: and(eq(productLikes.userId, userId), inArray(productLikes.productId, productIds)),
    columns: { productId: true },
  })
  return new Set(rows.map((r) => r.productId))
}

export async function hasUserLikedProduct(productId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const existing = await db.query.productLikes.findFirst({
    where: and(eq(productLikes.productId, productId), eq(productLikes.userId, userId)),
    columns: { id: true },
  })
  return Boolean(existing)
}

/** The home page's "Featured from the community" strip — published
 * products from *other* approved businesses. `excludeOwnerId` keeps a
 * seller's own listings out of their own feed (those live in My Catalog). */
export async function listFeaturedProducts({
  excludeOwnerId,
  limit = 12,
}: {
  excludeOwnerId?: string
  limit?: number
} = {}) {
  const db = getDb()
  // Filtered in application code rather than a raw exists-subquery on
  // `businesses` — that table is already joined once for `with: { business:
  // true }` in this same query, and Drizzle's relational query builder
  // mis-aliases a second bare reference to it inside a raw `sql` fragment
  // (columns render against the wrong table). A generous buffer keeps this
  // correct and still cheap at MVP scale.
  const candidates = await db.query.products.findMany({
    where: eq(products.status, "published"),
    orderBy: desc(products.createdAt),
    limit: limit * 4,
    with: { media: true, business: true },
  })

  return candidates
    .filter((p) => p.business.status === "approved" && (!excludeOwnerId || p.business.ownerId !== excludeOwnerId))
    .slice(0, limit)
}

/** Batched so the catalog listing (one query for N products) doesn't fire
 * an inquiry count query per card. */
export async function countInquiriesByProductIds(productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {}
  const db = getDb()
  const rows = await db
    .select({ productId: inquiries.productId, count: sql<number>`count(*)::int` })
    .from(inquiries)
    .where(inArray(inquiries.productId, productIds))
    .groupBy(inquiries.productId)

  return Object.fromEntries(rows.filter((r) => r.productId != null).map((r) => [r.productId as string, r.count]))
}
