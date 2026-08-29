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
  locale: "en" | "hi"
}

export type PriceSuggestionResult = {
  min: number
  max: number
  confidence: number
  engine: "ml_service" | "rules_engine" | "gemini"
  rationaleEn: string
  rationaleHi: string
}

const REFINEMENT_SCHEMA = {
  type: GeminiType.OBJECT,
  properties: {
    min: { type: GeminiType.NUMBER },
    max: { type: GeminiType.NUMBER },
    rationaleEn: { type: GeminiType.STRING },
    rationaleHi: { type: GeminiType.STRING },
  },
  required: ["min", "max", "rationaleEn", "rationaleHi"],
}

const SYSTEM_INSTRUCTION = `You refine a preliminary B2B wholesale price range for a handcrafted product, given a starting estimate from a pricing model and the product's own description.
- Nudge the range up or down by at most 20% based on what the description suggests about quality/materials/complexity — don't invent a wildly different price.
- Write rationaleEn and rationaleHi as one short, concrete sentence each explaining the suggested range in plain language an artisan would understand (e.g. "Based on similar cotton block-print items and your 10 years of experience"), not marketing language.`

/**
 * Chain: ML service -> deterministic rules engine -> Gemini refinement.
 * Each stage is optional; the rules engine is the only one guaranteed to run,
 * so a suggestion is always produced even with zero API keys configured.
 * Every suggestion is persisted with the engine that ultimately produced it.
 */
export async function suggestPrice(input: PriceSuggestionInput): Promise<PriceSuggestionResult> {
  let min: number
  let max: number
  let confidence: number
  let engine: PriceSuggestionResult["engine"]

  const mlResult = await predictPriceViaMlService(input)
  if (mlResult) {
    ;({ min, max, confidence } = mlResult)
    engine = "ml_service"
  } else {
    const bands = await findPriceReferenceByCategory(input.category)
    const scored = scoreWithRulesEngine(input, bands)
    min = scored.min
    max = scored.max
    confidence = scored.confidence
    engine = "rules_engine"
  }

  let rationaleEn = `Estimated from similar ${input.category.toLowerCase()} listings.`
  let rationaleHi = `समान ${input.category} उत्पादों के आधार पर अनुमानित।`

  if (features.gemini && input.descriptionEn) {
    try {
      const refined = await generateStructured<{ min: number; max: number; rationaleEn: string; rationaleHi: string }>({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: `Category: ${input.category}\nMaterial: ${input.material ?? "unknown"}\nDescription: ${input.descriptionEn}\nPreliminary range: ₹${min}-₹${max}\nArtisan experience: ${input.experienceYears} years`,
        schema: REFINEMENT_SCHEMA,
      })
      min = refined.min
      max = refined.max
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
    suggestedMin: String(min),
    suggestedMax: String(max),
    confidence: String(confidence),
    rationaleEn,
    rationaleHi,
    inputs: input,
  })

  return { min, max, confidence, engine, rationaleEn, rationaleHi }
}
