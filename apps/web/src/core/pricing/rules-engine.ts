import type { PriceReference } from "@/infra/db/schema"

const SIZE_MULTIPLIER: Record<"small" | "medium" | "large", number> = {
  small: 0.6,
  medium: 1.0,
  large: 1.6,
}

export type RulesEngineResult = {
  min: number
  max: number
  confidence: number
  matchedOn: "category+material+region" | "category+material" | "category" | "none"
}

/**
 * Deterministic and always available (no external call, no API key) — the
 * floor of the pricing chain. Scores against the seeded `price_reference`
 * bands, picking the closest match and scaling by size band. Fully
 * explainable: `matchedOn` says exactly which fields the confidence is
 * based on, unlike a model's opaque output.
 */
export function scoreWithRulesEngine(
  input: {
    category: string
    material?: string
    sizeBand: "small" | "medium" | "large"
    region?: string
  },
  bands: PriceReference[]
): RulesEngineResult {
  const sizeMult = SIZE_MULTIPLIER[input.sizeBand]

  const exact = bands.find(
    (b) => b.material === input.material && b.region === input.region
  )
  if (exact) {
    return {
      min: Math.round(Number(exact.priceMin) * sizeMult),
      max: Math.round(Number(exact.priceMax) * sizeMult),
      confidence: 0.65,
      matchedOn: "category+material+region",
    }
  }

  const materialMatch = bands.find((b) => b.material === input.material)
  if (materialMatch) {
    return {
      min: Math.round(Number(materialMatch.priceMin) * sizeMult),
      max: Math.round(Number(materialMatch.priceMax) * sizeMult),
      confidence: 0.5,
      matchedOn: "category+material",
    }
  }

  if (bands.length > 0) {
    const avgMin = bands.reduce((s, b) => s + Number(b.priceMin), 0) / bands.length
    const avgMax = bands.reduce((s, b) => s + Number(b.priceMax), 0) / bands.length
    return {
      min: Math.round(avgMin * sizeMult),
      max: Math.round(avgMax * sizeMult),
      confidence: 0.35,
      matchedOn: "category",
    }
  }

  // No reference data for this category at all — a wide, honest default.
  return { min: 200, max: 2000, confidence: 0.15, matchedOn: "none" }
}
