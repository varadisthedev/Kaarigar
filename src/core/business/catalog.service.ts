import "server-only"

import { createProduct, addProductMedia, findBusinessById } from "@/infra/db/repositories/business.repository"
import { generateUniqueSlug } from "./slug"

export type CreateProductInput = {
  businessId: string
  ownerId: string
  titleEn: string
  titleHi?: string
  descriptionEn?: string
  descriptionHi?: string
  materials?: string[]
  dimensions?: string
  moq?: number
  unit?: string
  priceMin?: number
  priceMax?: number
  leadTimeDays?: number
  seoKeywords?: string[]
  photos: { url: string; publicId: string; enhancedUrl?: string }[]
}

export type CreateProductResult =
  | { ok: true; product: { id: string; slug: string } }
  | { ok: false; error: "not_found" | "forbidden" }

/** A business that's already approved can list products directly — only the
 * *first* submission (the business itself) goes through admin review. */
export async function createProductListing(input: CreateProductInput): Promise<CreateProductResult> {
  const business = await findBusinessById(input.businessId)
  if (!business) return { ok: false, error: "not_found" }
  if (business.ownerId !== input.ownerId) return { ok: false, error: "forbidden" }

  const slug = await generateUniqueSlug(input.titleEn)

  const product = await createProduct({
    businessId: input.businessId,
    slug,
    titleEn: input.titleEn,
    titleHi: input.titleHi,
    descriptionEn: input.descriptionEn,
    descriptionHi: input.descriptionHi,
    materials: input.materials,
    dimensions: input.dimensions,
    moq: input.moq ?? 1,
    unit: input.unit ?? "piece",
    priceMin: input.priceMin != null ? String(input.priceMin) : undefined,
    priceMax: input.priceMax != null ? String(input.priceMax) : undefined,
    leadTimeDays: input.leadTimeDays,
    seoKeywords: input.seoKeywords,
    status: business.status === "approved" ? "published" : "draft",
  })

  await Promise.all(
    input.photos.map((photo, i) =>
      addProductMedia({
        productId: product.id,
        cloudinaryPublicId: photo.publicId,
        url: photo.url,
        enhancedUrl: photo.enhancedUrl,
        isPrimary: i === 0,
      })
    )
  )

  return { ok: true, product: { id: product.id, slug: product.slug } }
}
