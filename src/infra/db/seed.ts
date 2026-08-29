import { eq } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"
import {
  users,
  businesses,
  businessMedia,
  products,
  productMedia,
  priceReference,
} from "./schema"
import { adminPhoneNumbers } from "@/config/env"
import { generateBusinessCode } from "@/core/business/business-code"

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

/**
 * Demo data only — three approved businesses + one pending_review, so the
 * marketplace and the admin queue both have something to show on first run.
 * Safe to re-run: every insert is keyed off a natural field and skipped if a
 * matching row already exists.
 */

type SeedBusiness = {
  ownerPhone: string
  ownerName: string
  displayName: string
  craftCategory: string
  descriptionEn: string
  descriptionHi: string
  district: string
  state: string
  pincode: string
  yearsExperience: number
  monthlyCapacity: string
  status: "approved" | "pending_review"
  coverImage: string
  logoImage: string
  product: {
    slug: string
    titleEn: string
    titleHi: string
    descriptionEn: string
    descriptionHi: string
    materials: string[]
    dimensions: string
    unit: string
    priceMin: string
    priceMax: string
    leadTimeDays: number
    seoKeywords: string[]
    image: string
  }
}

const seedBusinesses: SeedBusiness[] = [
  {
    ownerPhone: "+919800000001",
    ownerName: "Rukhsana Khatri",
    displayName: "Kutch Ajrakh Block Print Co-operative",
    craftCategory: "Block Printing",
    descriptionEn:
      "A family workshop in Bhuj practicing traditional Ajrakh hand block printing for four generations, using natural indigo and madder-root dyes on hand-loomed cotton.",
    descriptionHi:
      "भुज की एक पारिवारिक कार्यशाला जो चार पीढ़ियों से पारंपरिक अजरख हाथ की ब्लॉक प्रिंटिंग करती है, हाथ से बुने सूती कपड़े पर प्राकृतिक नील और मजीठ रंगों का उपयोग करते हुए।",
    district: "Bhuj",
    state: "Gujarat",
    pincode: "370001",
    yearsExperience: 22,
    monthlyCapacity: "200-250 meters",
    status: "approved",
    coverImage: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1600&q=80",
    logoImage: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80",
    product: {
      slug: "ajrakh-hand-block-print-cotton-fabric",
      titleEn: "Ajrakh Hand Block Print Cotton Fabric",
      titleHi: "अजरख हाथ ब्लॉक प्रिंट सूती कपड़ा",
      descriptionEn:
        "Pure cotton fabric hand block printed in the traditional Ajrakh technique — natural indigo and madder dyes, geometric motifs, sold by the meter. Ideal for apparel and home textile B2B orders.",
      descriptionHi:
        "पारंपरिक अजरख तकनीक से हाथ से ब्लॉक प्रिंट किया गया शुद्ध सूती कपड़ा — प्राकृतिक नील और मजीठ रंग, ज्यामितीय आकृतियाँ, मीटर के हिसाब से बिकता है।",
      materials: ["cotton", "natural indigo dye", "madder root dye"],
      dimensions: "112 cm width, sold per running meter",
      unit: "meter",
      priceMin: "280.00",
      priceMax: "420.00",
      leadTimeDays: 12,
      seoKeywords: ["ajrakh print", "block print fabric", "gujarat handicraft", "indigo cotton", "b2b textile supplier"],
      image: "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?w=1200&q=80",
    },
  },
  {
    ownerPhone: "+919800000002",
    ownerName: "Ramesh Prasad Maurya",
    displayName: "Varanasi Banarasi Weaves",
    craftCategory: "Handloom Weaving",
    descriptionEn:
      "A pit-loom weaving unit in Varanasi producing authentic Banarasi silk sarees with real zari brocade, run by a family of master weavers for over three decades.",
    descriptionHi:
      "वाराणसी में पिट-लूम बुनाई इकाई जो असली जरी बुनावट के साथ प्रामाणिक बनारसी सिल्क साड़ियाँ बनाती है, तीन दशकों से अधिक समय से मास्टर बुनकरों के परिवार द्वारा संचालित।",
    district: "Varanasi",
    state: "Uttar Pradesh",
    pincode: "221001",
    yearsExperience: 31,
    monthlyCapacity: "40-60 sarees",
    status: "approved",
    coverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&q=80",
    logoImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80",
    product: {
      slug: "banarasi-silk-saree-zari-border",
      titleEn: "Banarasi Silk Saree — Zari Border",
      titleHi: "बनारसी सिल्क साड़ी - जरी बॉर्डर",
      descriptionEn:
        "Handwoven pure silk Banarasi saree with genuine zari brocade border and pallu, woven on a traditional pit loom. Available in bulk for wholesale and retail partners.",
      descriptionHi:
        "पारंपरिक पिट लूम पर बुनी गई शुद्ध सिल्क बनारसी साड़ी, असली जरी बुनावट वाले बॉर्डर और पल्लू के साथ। थोक और खुदरा भागीदारों के लिए बड़ी मात्रा में उपलब्ध।",
      materials: ["mulberry silk", "zari (metallic thread)"],
      dimensions: "6.3 meters length, 1.1 meters width",
      unit: "piece",
      priceMin: "4500.00",
      priceMax: "12000.00",
      leadTimeDays: 20,
      seoKeywords: ["banarasi saree", "silk saree wholesale", "zari saree", "varanasi handloom", "b2b saree supplier"],
      image: "https://images.unsplash.com/photo-1610030181087-540f92e6dea8?w=1200&q=80",
    },
  },
  {
    ownerPhone: "+919800000003",
    ownerName: "Lakshmi Gowda",
    displayName: "Channapatna Toys Collective",
    craftCategory: "Wooden Lacquerware",
    descriptionEn:
      "A GI-tagged Channapatna toy-making unit producing lacquer-finished wooden toys from ivory-wood using vegetable dyes, a craft over 200 years old in this region of Karnataka.",
    descriptionHi:
      "एक जीआई-टैग प्राप्त चन्नपटना खिलौना निर्माण इकाई जो हाथी दांत की लकड़ी से सब्जी रंगों का उपयोग करते हुए लाख-पॉलिश लकड़ी के खिलौने बनाती है, कर्नाटक के इस क्षेत्र में 200 साल से अधिक पुरानी शिल्पकला।",
    district: "Channapatna",
    state: "Karnataka",
    pincode: "562160",
    yearsExperience: 18,
    monthlyCapacity: "800-1000 pieces",
    status: "approved",
    coverImage: "https://images.unsplash.com/photo-1558877385-1c4b8f2e8b9a?w=1600&q=80",
    logoImage: "https://images.unsplash.com/photo-1558877385-1c4b8f2e8b9a?w=400&q=80",
    product: {
      slug: "channapatna-lacquer-wooden-toy-set",
      titleEn: "Channapatna Lacquer Wooden Toy Set",
      titleHi: "चन्नपटना लाख लकड़ी खिलौना सेट",
      descriptionEn:
        "Hand-turned, lacquer-finished wooden toy set made from sustainably sourced ivory-wood with non-toxic vegetable dyes. GI-tagged Channapatna craftsmanship, safe for children, packed for bulk export.",
      descriptionHi:
        "टिकाऊ स्रोत वाली हाथी दांत की लकड़ी से हाथ से बना, लाख-पॉलिश लकड़ी का खिलौना सेट, गैर-विषैले सब्जी रंगों के साथ। जीआई-टैग प्राप्त चन्नपटना शिल्पकला, बच्चों के लिए सुरक्षित।",
      materials: ["ivory-wood (aale mara)", "vegetable dye", "natural lacquer"],
      dimensions: "set of 5, 6-12 cm each",
      unit: "set",
      priceMin: "180.00",
      priceMax: "550.00",
      leadTimeDays: 15,
      seoKeywords: ["channapatna toys", "wooden toys india", "lacquer toys", "gi tagged handicraft", "eco friendly toys wholesale"],
      image: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&q=80",
    },
  },
  {
    ownerPhone: "+919800000004",
    ownerName: "Sita Devi",
    displayName: "Madhubani Art Studio",
    craftCategory: "Folk Painting",
    descriptionEn:
      "An emerging Madhubani (Mithila) painting studio near Madhubani town, creating traditional folk art on handmade paper and canvas using natural pigments.",
    descriptionHi:
      "मधुबनी शहर के पास एक उभरता हुआ मधुबनी (मिथिला) चित्रकला स्टूडियो, जो प्राकृतिक रंगों का उपयोग करके हस्तनिर्मित कागज और कैनवास पर पारंपरिक लोक कला बनाता है।",
    district: "Madhubani",
    state: "Bihar",
    pincode: "847211",
    yearsExperience: 6,
    monthlyCapacity: "60-80 paintings",
    status: "pending_review",
    coverImage: "https://images.unsplash.com/photo-1582561833792-ed1417b8dbec?w=1600&q=80",
    logoImage: "https://images.unsplash.com/photo-1582561833792-ed1417b8dbec?w=400&q=80",
    product: {
      slug: "madhubani-folk-painting-canvas",
      titleEn: "Madhubani Folk Painting on Canvas",
      titleHi: "कैनवास पर मधुबनी लोक चित्रकला",
      descriptionEn:
        "Original Madhubani (Mithila) folk painting hand-painted on canvas with natural pigments, depicting traditional motifs of nature and mythology. Submitted for review — not yet listed.",
      descriptionHi:
        "प्राकृतिक रंगों के साथ कैनवास पर हाथ से चित्रित मूल मधुबनी (मिथिला) लोक चित्रकला, प्रकृति और पौराणिक कथाओं के पारंपरिक रूपांकनों को दर्शाती है।",
      materials: ["canvas", "natural pigments", "bamboo brush"],
      dimensions: "40 cm x 60 cm",
      unit: "piece",
      priceMin: "900.00",
      priceMax: "3200.00",
      leadTimeDays: 10,
      seoKeywords: ["madhubani painting", "mithila art", "folk art india", "handmade wall art wholesale"],
      image: "https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1200&q=80",
    },
  },
]

const seedPriceReference = [
  { craftCategory: "Block Printing", material: "cotton", sizeBand: "medium", region: "Gujarat", priceMin: "250.00", priceMax: "450.00" },
  { craftCategory: "Handloom Weaving", material: "silk", sizeBand: "large", region: "Uttar Pradesh", priceMin: "4500.00", priceMax: "12000.00" },
  { craftCategory: "Wooden Lacquerware", material: "wood", sizeBand: "small", region: "Karnataka", priceMin: "150.00", priceMax: "600.00" },
  { craftCategory: "Folk Painting", material: "canvas", sizeBand: "medium", region: "Bihar", priceMin: "800.00", priceMax: "3500.00" },
]

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

  for (const b of seedBusinesses) {
    const existingOwner = await db.query.users.findFirst({ where: eq(users.phoneE164, b.ownerPhone) })
    const owner =
      existingOwner ??
      (
        await db
          .insert(users)
          .values({
            phoneE164: b.ownerPhone,
            countryCode: "+91",
            name: b.ownerName,
            role: "artisan",
            locale: "en",
          })
          .returning()
      )[0]

    const existingBusiness = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, owner.id),
    })
    if (existingBusiness) {
      console.log(`[seed] business "${b.displayName}" already exists, skipping`)
      continue
    }

    const isApproved = b.status === "approved"
    const [business] = await db
      .insert(businesses)
      .values({
        ownerId: owner.id,
        businessCode: isApproved ? generateBusinessCode(b.state) : null,
        displayName: b.displayName,
        craftCategory: b.craftCategory,
        descriptionEn: b.descriptionEn,
        descriptionHi: b.descriptionHi,
        district: b.district,
        state: b.state,
        pincode: b.pincode,
        logoUrl: b.logoImage,
        coverUrl: b.coverImage,
        yearsExperience: b.yearsExperience,
        monthlyCapacity: b.monthlyCapacity,
        status: b.status,
        submittedAt: new Date(),
        reviewedAt: isApproved ? new Date() : null,
      })
      .returning()

    await db.insert(businessMedia).values({
      businessId: business.id,
      cloudinaryPublicId: `seed/${b.product.slug}-cover`,
      url: b.coverImage,
      isPrimary: true,
      altEn: `${b.displayName} workshop`,
      altHi: `${b.displayName} कार्यशाला`,
    })

    const [product] = await db
      .insert(products)
      .values({
        businessId: business.id,
        slug: b.product.slug,
        titleEn: b.product.titleEn,
        titleHi: b.product.titleHi,
        descriptionEn: b.product.descriptionEn,
        descriptionHi: b.product.descriptionHi,
        materials: b.product.materials,
        dimensions: b.product.dimensions,
        unit: b.product.unit,
        priceMin: b.product.priceMin,
        priceMax: b.product.priceMax,
        leadTimeDays: b.product.leadTimeDays,
        seoKeywords: b.product.seoKeywords,
        status: isApproved ? "published" : "draft",
      })
      .returning()

    await db.insert(productMedia).values({
      productId: product.id,
      cloudinaryPublicId: `seed/${b.product.slug}-1`,
      url: b.product.image,
      isPrimary: true,
      altEn: b.product.titleEn,
      altHi: b.product.titleHi,
    })

    console.log(`[seed] created business "${b.displayName}" (${b.status})`)
  }

  for (const ref of seedPriceReference) {
    const existing = await db.query.priceReference.findFirst({
      where: eq(priceReference.craftCategory, ref.craftCategory),
    })
    if (existing) continue
    await db.insert(priceReference).values(ref)
  }
  console.log(`[seed] price reference bands ensured`)

  console.log("[seed] done.")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err)
    process.exit(1)
  })
