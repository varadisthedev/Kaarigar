import "server-only"
import { and, desc, eq, ilike, gte, lte, sql } from "drizzle-orm"

import { getDb } from "../client"
import {
  businesses,
  businessMedia,
  products,
  productMedia,
  type NewBusiness,
  type NewBusinessMedia,
  type NewProduct,
  type NewProductMedia,
} from "../schema"

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

export async function listPendingReviewBusinesses() {
  const db = getDb()
  return db.query.businesses.findMany({
    where: eq(businesses.status, "pending_review"),
    orderBy: businesses.submittedAt,
    with: { media: true, products: { with: { media: true } } },
  })
}

export async function approveBusiness(id: string, businessCode: string, reviewedBy: string) {
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
    conditions.push(
      sql`(${ilike(businesses.displayName, term)} or exists (
        select 1 from ${products}
        where ${eq(products.businessId, businesses.id)}
          and ${eq(products.status, "published")}
          and ${ilike(products.titleEn, term)}
      ))`
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
