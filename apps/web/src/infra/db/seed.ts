import { eq } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"
import {
  users,
  priceReference,
  businesses,
  products,
  productMedia,
  businessMedia,
  productViewsDaily,
  inquiries,
  orders,
  payments,
} from "./schema"
import { adminPhoneNumbers } from "@/config/env"

const VARAD_PHONE = "+919579948495"
const DEMO_BUYER_PHONE = "+919876543210"
const DEMO_BUSINESS_CODE = "CM-MH-SEED01"

// A standalone script (run via `tsx`, outside the Next.js bundler), so it
// builds its own connection rather than importing `./client` — that module
// is guarded with `server-only`, which throws when loaded outside Next.
function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set — add it to .env.local first.")
  }
  return drizzle(neon(url), { schema })
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function monthStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(12, 0, 0, 0)
  return d
}

/**
 * Infrastructure seeding only — no demo/dummy businesses or products. The
 * marketplace and every dashboard render from real submissions.
 *   - Admin users: needed to reach /admin at all.
 *   - price_reference: reference price bands the pricing rules engine scores
 *     against (core/pricing/rules-engine.ts) — this is system reference
 *     data, not user-facing content, so it stays seeded even with an
 *     otherwise-empty database.
 *   - Varad demo account (+919579948495): analytics dashboard sample data.
 */
const seedPriceReference = [
  { craftCategory: "Block Printing", material: "cotton", sizeBand: "medium", region: "Gujarat", priceMin: "250.00", priceMax: "450.00" },
  { craftCategory: "Handloom Weaving", material: "silk", sizeBand: "large", region: "Uttar Pradesh", priceMin: "4500.00", priceMax: "12000.00" },
  { craftCategory: "Wooden Lacquerware", material: "wood", sizeBand: "small", region: "Karnataka", priceMin: "150.00", priceMax: "600.00" },
  { craftCategory: "Folk Painting", material: "canvas", sizeBand: "medium", region: "Bihar", priceMin: "800.00", priceMax: "3500.00" },
  { craftCategory: "Pottery & Ceramics", material: "clay", sizeBand: "medium", region: "Rajasthan", priceMin: "200.00", priceMax: "1200.00" },
  { craftCategory: "Embroidery", material: "cotton", sizeBand: "medium", region: "Punjab", priceMin: "400.00", priceMax: "2500.00" },
  { craftCategory: "Metalwork", material: "brass", sizeBand: "medium", region: "West Bengal", priceMin: "300.00", priceMax: "3000.00" },
  { craftCategory: "Jewelry Making", material: "silver", sizeBand: "small", region: "Rajasthan", priceMin: "500.00", priceMax: "5000.00" },
  { craftCategory: "Leatherwork", material: "leather", sizeBand: "medium", region: "Uttar Pradesh", priceMin: "350.00", priceMax: "2000.00" },
  { craftCategory: "Bamboo & Cane Craft", material: "bamboo", sizeBand: "medium", region: "Assam", priceMin: "100.00", priceMax: "900.00" },
]

const DEMO_PRODUCTS = [
  {
    slug: "varad-blue-pottery-vase",
    titleEn: "Blue Pottery Vase",
    titleHi: "नीली मिट्टी का फूलदान",
    priceMin: "1200.00",
    priceMax: "1800.00",
    image: {
      url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1200&q=80",
      publicId: "seed/varad-blue-pottery-vase",
      altEn: "Hand-painted blue pottery vase",
    },
  },
  {
    slug: "varad-handwoven-saree",
    titleEn: "Handwoven Silk Saree",
    titleHi: "हाथ से बुनी रेशम साड़ी",
    priceMin: "8500.00",
    priceMax: "12000.00",
    image: {
      url: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=1200&q=80",
      publicId: "seed/varad-handwoven-saree",
      altEn: "Colorful handwoven silk saree fabric",
    },
  },
  {
    slug: "varad-brass-lantern",
    titleEn: "Brass Heritage Lantern",
    titleHi: "पीतल की विरासत लालटेन",
    priceMin: "2200.00",
    priceMax: "3200.00",
    image: {
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80",
      publicId: "seed/varad-brass-lantern",
      altEn: "Ornate brass heritage lantern",
    },
  },
] as const

const DEMO_BUSINESS_LOGO = {
  url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80",
  publicId: "seed/varad-business-logo",
}

async function seedVaradDemo(db: ReturnType<typeof getDb>) {
  let seller = await db.query.users.findFirst({ where: eq(users.phoneE164, VARAD_PHONE) })
  if (!seller) {
    ;[seller] = await db
      .insert(users)
      .values({
        phoneE164: VARAD_PHONE,
        countryCode: "+91",
        username: "varad",
        name: "Varad",
        role: "artisan",
        locale: "en",
        state: "Maharashtra",
        district: "Mumbai",
        profileCompletedAt: new Date(),
      })
      .returning()
    console.log(`[seed] created demo seller ${VARAD_PHONE} (varad)`)
  } else {
    await db
      .update(users)
      .set({
        username: "varad",
        name: seller.name ?? "Varad",
        profileCompletedAt: seller.profileCompletedAt ?? new Date(),
        state: seller.state ?? "Maharashtra",
        district: seller.district ?? "Mumbai",
      })
      .where(eq(users.id, seller.id))
  }

  let buyer = await db.query.users.findFirst({ where: eq(users.phoneE164, DEMO_BUYER_PHONE) })
  if (!buyer) {
    ;[buyer] = await db
      .insert(users)
      .values({
        phoneE164: DEMO_BUYER_PHONE,
        countryCode: "+91",
        name: "Demo Buyer",
        role: "artisan",
        locale: "en",
      })
      .returning()
  }

  let business =
    (await db.query.businesses.findFirst({
      where: eq(businesses.businessCode, DEMO_BUSINESS_CODE),
    })) ??
    (await db.query.businesses.findFirst({ where: eq(businesses.ownerId, seller.id) }))

  if (!business) {
    ;[business] = await db
      .insert(businesses)
      .values({
        ownerId: seller.id,
        businessCode: DEMO_BUSINESS_CODE,
        displayName: "Varad Handicrafts",
        craftCategory: "Pottery & Ceramics",
        descriptionEn: "Handcrafted pottery and textiles from Mumbai.",
        district: "Mumbai",
        state: "Maharashtra",
        monthlyIncomeTarget: "100000.00",
        status: "approved",
        submittedAt: new Date(),
        reviewedAt: new Date(),
        logoUrl: DEMO_BUSINESS_LOGO.url,
        logoPublicId: DEMO_BUSINESS_LOGO.publicId,
      })
      .returning()
    console.log(`[seed] created demo business for varad`)
  } else {
    await db
      .update(businesses)
      .set({
        monthlyIncomeTarget: "100000.00",
        status: "approved",
        businessCode: business.businessCode ?? DEMO_BUSINESS_CODE,
        logoUrl: business.logoUrl ?? DEMO_BUSINESS_LOGO.url,
        logoPublicId: business.logoPublicId ?? DEMO_BUSINESS_LOGO.publicId,
      })
      .where(eq(businesses.id, business.id))
  }

  const existingBusinessPhoto = await db.query.businessMedia.findFirst({
    where: eq(businessMedia.businessId, business.id),
  })
  if (!existingBusinessPhoto) {
    await db.insert(businessMedia).values({
      businessId: business.id,
      cloudinaryPublicId: DEMO_BUSINESS_LOGO.publicId,
      url: DEMO_BUSINESS_LOGO.url,
      mediaType: "photo",
      isPrimary: true,
      altEn: "Varad Handicrafts workshop",
    })
    console.log(`[seed] added business photo for varad demo`)
  }

  const productRows: { id: string; slug: string }[] = []
  for (const demo of DEMO_PRODUCTS) {
    let product = await db.query.products.findFirst({ where: eq(products.slug, demo.slug) })
    if (!product) {
      ;[product] = await db
        .insert(products)
        .values({
          businessId: business.id,
          slug: demo.slug,
          titleEn: demo.titleEn,
          titleHi: demo.titleHi,
          descriptionEn: `Handmade ${demo.titleEn.toLowerCase()} by Varad Handicrafts.`,
          priceMin: demo.priceMin,
          priceMax: demo.priceMax,
          status: "published",
          viewCount: 0,
        })
        .returning()
    }

    const existingMedia = await db.query.productMedia.findFirst({
      where: eq(productMedia.productId, product.id),
    })
    if (!existingMedia) {
      await db.insert(productMedia).values({
        productId: product.id,
        cloudinaryPublicId: demo.image.publicId,
        url: demo.image.url,
        mediaType: "photo",
        isPrimary: true,
        altEn: demo.image.altEn,
      })
    } else if (existingMedia.cloudinaryPublicId.startsWith("seed/")) {
      await db
        .update(productMedia)
        .set({ url: demo.image.url, altEn: demo.image.altEn })
        .where(eq(productMedia.id, existingMedia.id))
    }

    productRows.push({ id: product.id, slug: demo.slug })
  }
  console.log(`[seed] ensured product photos for varad demo`)

  const existingViews = await db.query.productViewsDaily.findFirst({
    where: eq(productViewsDaily.businessId, business.id),
  })
  if (!existingViews) {
    for (let day = 29; day >= 0; day--) {
      const date = daysAgoIso(day)
      const baseViews = 8 + Math.floor((29 - day) * 1.5)
      for (let i = 0; i < productRows.length; i++) {
        const productId = productRows[i].id
        const views = baseViews + i * 3 + (day % 5)
        await db.insert(productViewsDaily).values({
          productId,
          businessId: business.id,
          date,
          viewCount: views,
        })
      }
    }
    console.log(`[seed] inserted 30-day view history for varad demo`)
  }

  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.businessId, business.id),
  })
  if (!existingOrder) {
    const paidAt = monthStart()
    const demoDeals = [
      { productIdx: 0, total: "45000.00", advance: "9000.00", status: "advance_paid" as const },
      { productIdx: 1, total: "28000.00", advance: "5600.00", status: "advance_paid" as const },
      { productIdx: 2, total: "12000.00", advance: "12000.00", status: "completed" as const },
      { productIdx: 0, total: "35000.00", advance: "7000.00", status: "in_production" as const },
    ]

    for (const deal of demoDeals) {
      const product = productRows[deal.productIdx]
      const [inquiry] = await db
        .insert(inquiries)
        .values({
          businessId: business.id,
          productId: product.id,
          buyerId: buyer.id,
          quantity: "1",
          status: "accepted",
        })
        .returning()

      const [order] = await db
        .insert(orders)
        .values({
          inquiryId: inquiry.id,
          buyerId: buyer.id,
          businessId: business.id,
          totalAmount: deal.total,
          advancePercent: "20",
          advanceAmount: deal.advance,
          status: deal.status,
          updatedAt: paidAt,
        })
        .returning()

      await db.insert(payments).values({
        orderId: order.id,
        amount: deal.advance,
        status: "paid",
        razorpayOrderId: `seed_order_${order.id.slice(0, 8)}`,
        razorpayPaymentId: `seed_pay_${order.id.slice(0, 8)}`,
        updatedAt: paidAt,
      })
    }
    console.log(`[seed] inserted demo orders/payments for varad analytics`)
  }
}

async function main() {
  const db = getDb()

  for (const admin of adminPhoneNumbers()) {
    const existing = await db.query.users.findFirst({ where: eq(users.phoneE164, admin) })
    if (existing) continue
    await db.insert(users).values({
      phoneE164: admin,
      countryCode: "+91",
      name: "Admin",
      role: "admin",
      locale: "en",
    })
    console.log(`[seed] created admin user ${admin}`)
  }

  for (const ref of seedPriceReference) {
    const existing = await db.query.priceReference.findFirst({
      where: eq(priceReference.craftCategory, ref.craftCategory),
    })
    if (existing) continue
    await db.insert(priceReference).values(ref)
  }
  console.log(`[seed] price reference bands ensured`)

  await seedVaradDemo(db)

  console.log("[seed] done.")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err)
    process.exit(1)
  })
