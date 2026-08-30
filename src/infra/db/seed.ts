import { eq } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"
import { users, priceReference } from "./schema"
import { adminPhoneNumbers } from "@/config/env"

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
 * Infrastructure seeding only — no demo/dummy businesses or products. The
 * marketplace and every dashboard render from real submissions.
 *   - Admin users: needed to reach /admin at all.
 *   - price_reference: reference price bands the pricing rules engine scores
 *     against (core/pricing/rules-engine.ts) — this is system reference
 *     data, not user-facing content, so it stays seeded even with an
 *     otherwise-empty database.
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

  console.log("[seed] done.")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err)
    process.exit(1)
  })
