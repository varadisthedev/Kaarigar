import "server-only"

import { features } from "@/config/env"
import { predictPriceViaMlService } from "@/infra/ml/ml-service.client"
import { findPriceReferenceByCategory, createPriceSuggestion } from "@/infra/db/repositories/pricing.repository"
import { generateStructured, GeminiType } from "@/infra/ai/gemini.client"
import { scoreWithRulesEngine } from "./rules-engine"

export type PriceSuggestionInput = {
  productId?: string
  category: string
  material?: string
  sizeBand: "small" | "medium" | "large"
  region?: string
  leadTimeDays: number
  experienceYears: number
  descriptionEn?: string
  /** What the artisan says raw materials cost them — informational context
   * for the rationale, not something that overrides the market-derived
   * estimate (the PS explicitly wants this shown, not baked in silently). */
  materialCost?: number
  locale: "en" | "hi" | "mr"
}

export type PriceSuggestionResult = {
  price: number
  marketMin: number
  marketMax: number
  materialCost?: number
  confidence: number
  engine: "ml_service" | "rules_engine" | "gemini"
  rationaleEn: string
  rationaleHi: string
}

const REFINEMENT_SCHEMA = {
  type: GeminiType.OBJECT,
  properties: {
    price: { type: GeminiType.NUMBER },
    rationaleEn: { type: GeminiType.STRING },
    rationaleHi: { type: GeminiType.STRING },
  },
  required: ["price", "rationaleEn", "rationaleHi"],
}

const SYSTEM_INSTRUCTION = `You refine a preliminary B2B wholesale price for a handcrafted product, given a starting estimate from a pricing model, the product's own description, and (when available) what the artisan says raw materials cost them.
- Nudge the price up or down by at most 20% based on what the description suggests about quality/materials/complexity — don't invent a wildly different price.
- The final price must stay comfortably above the stated material cost when one is given — never suggest a price that leaves the artisan with a negligible or negative margin.
- Write rationaleEn and rationaleHi as one short, concrete sentence each explaining the suggested price in plain language an artisan would understand (e.g. "Based on similar cotton block-print items and your 10 years of experience"), not marketing language.`

/**
 * Chain: ML service -> deterministic rules engine -> Gemini refinement.
 * Each stage is optional; the rules engine is the only one guaranteed to run,
 * so a suggestion is always produced even with zero API keys configured.
 * Every suggestion is persisted with the engine that ultimately produced it.
 * Returns both the market range and a single point estimate — the caller
 * shows "material cost / market range / suggested price" per the PS.
 */
export async function suggestPrice(input: PriceSuggestionInput): Promise<PriceSuggestionResult> {
  let price: number
  let marketMin: number
  let marketMax: number
  let confidence: number
  let engine: PriceSuggestionResult["engine"]

  const mlResult = await predictPriceViaMlService(input)
  if (mlResult) {
    ;({ price, min: marketMin, max: marketMax, confidence } = mlResult)
    engine = "ml_service"
  } else {
    const bands = await findPriceReferenceByCategory(input.category)
    const scored = scoreWithRulesEngine(input, bands)
    price = scored.price
    marketMin = scored.min
    marketMax = scored.max
    confidence = scored.confidence
    engine = "rules_engine"
  }

  let rationaleEn = `Estimated from similar ${input.category.toLowerCase()} listings.`
  let rationaleHi = `समान ${input.category} उत्पादों के आधार पर अनुमानित।`

  if (features.gemini && input.descriptionEn) {
    try {
      const refined = await generateStructured<{ price: number; rationaleEn: string; rationaleHi: string }>({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: `Category: ${input.category}\nMaterial: ${input.material ?? "unknown"}\nDescription: ${input.descriptionEn}\nMarket range: ₹${marketMin}-₹${marketMax}\nPreliminary estimate: ₹${price}\nMaterial cost (artisan-reported): ${input.materialCost != null ? `₹${input.materialCost}` : "not provided"}\nArtisan experience: ${input.experienceYears} years`,
        schema: REFINEMENT_SCHEMA,
      })
      price = refined.price
      rationaleEn = refined.rationaleEn
      rationaleHi = refined.rationaleHi
      engine = "gemini"
    } catch (err) {
      console.error("[pricing] Gemini refinement failed, keeping prior estimate:", err)
    }
  }

  await createPriceSuggestion({
    productId: input.productId,
    engine,
    suggestedMin: String(marketMin),
    suggestedMax: String(marketMax),
    confidence: String(confidence),
    rationaleEn,
    rationaleHi,
    inputs: { ...input, price },
  })

  return { price, marketMin, marketMax, materialCost: input.materialCost, confidence, engine, rationaleEn, rationaleHi }
}
