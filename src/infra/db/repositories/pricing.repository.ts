import "server-only"
import { eq } from "drizzle-orm"

import { getDb } from "../client"
import { priceReference, priceSuggestions, type NewPriceSuggestion } from "../schema"

export async function findPriceReferenceByCategory(craftCategory: string) {
  const db = getDb()
  return db.query.priceReference.findMany({ where: eq(priceReference.craftCategory, craftCategory) })
}

export async function createPriceSuggestion(input: NewPriceSuggestion) {
  const db = getDb()
  const [suggestion] = await db.insert(priceSuggestions).values(input).returning()
  return suggestion
}
