import "server-only"

import {
  createProduct,
  addProductMedia,
  findBusinessById,
  findProductById,
  updateProduct,
} from "@/infra/db/repositories/business.repository"
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
  photos: { url: string; publicId: string; enhancedUrl?: string; mediaType?: "photo" | "video" }[]
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

  // The primary thumbnail (used everywhere a single image represents the
  // product — cards, marketplace grid) must be a photo, never a video.
  const firstPhotoIndex = input.photos.findIndex((p) => (p.mediaType ?? "photo") === "photo")

  await Promise.all(
    input.photos.map((photo, i) =>
      addProductMedia({
        productId: product.id,
        cloudinaryPublicId: photo.publicId,
        url: photo.url,
        enhancedUrl: photo.enhancedUrl,
        mediaType: photo.mediaType ?? "photo",
        isPrimary: firstPhotoIndex === -1 ? i === 0 : i === firstPhotoIndex,
      })
    )
  )

  return { ok: true, product: { id: product.id, slug: product.slug } }
}

export type UpdateProductInput = {
  productId: string
  ownerId: string
  titleEn?: string
  descriptionEn?: string
  materials?: string[]
  dimensions?: string
  priceMin?: number
  priceMax?: number
  seoKeywords?: string[]
}

export type UpdateProductResult = { ok: true } | { ok: false; error: "not_found" | "forbidden" }

/** Status is never editable here — it's system-decided (draft on creation,
 * published once the owning business is approved; see createProductListing).
 * Sellers can only edit their own listing content and tags. */
export async function updateProductListing(input: UpdateProductInput): Promise<UpdateProductResult> {
  const product = await findProductById(input.productId)
  if (!product) return { ok: false, error: "not_found" }
  if (product.business.ownerId !== input.ownerId) return { ok: false, error: "forbidden" }

  await updateProduct(input.productId, {
    titleEn: input.titleEn,
    descriptionEn: input.descriptionEn,
    materials: input.materials,
    dimensions: input.dimensions,
    priceMin: input.priceMin != null ? String(input.priceMin) : undefined,
    priceMax: input.priceMax != null ? String(input.priceMax) : undefined,
    seoKeywords: input.seoKeywords,
  })

  return { ok: true }
}
