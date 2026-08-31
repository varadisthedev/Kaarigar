import type { PriceReference } from "@/infra/db/schema"

const SIZE_MULTIPLIER: Record<"small" | "medium" | "large", number> = {
  small: 0.6,
  medium: 1.0,
  large: 1.6,
}

export type RulesEngineResult = {
  price: number
  min: number
  max: number
  confidence: number
  matchedOn: "category+material+region" | "category+material" | "category" | "none"
}

function result(min: number, max: number, confidence: number, matchedOn: RulesEngineResult["matchedOn"]): RulesEngineResult {
  return { min, max, price: Math.round((min + max) / 2), confidence, matchedOn }
}

/**
 * Deterministic and always available (no external call, no API key) — the
 * floor of the pricing chain. Scores against the seeded `price_reference`
 * bands, picking the closest match and scaling by size band. Fully
 * explainable: `matchedOn` says exactly which fields the confidence is
 * based on, unlike a model's opaque output. Returns both the market range
 * (min/max) and a single point estimate (their midpoint) — the UI shows
 * both.
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
    return result(
      Math.round(Number(exact.priceMin) * sizeMult),
      Math.round(Number(exact.priceMax) * sizeMult),
      0.65,
      "category+material+region"
    )
  }

  const materialMatch = bands.find((b) => b.material === input.material)
  if (materialMatch) {
    return result(
      Math.round(Number(materialMatch.priceMin) * sizeMult),
      Math.round(Number(materialMatch.priceMax) * sizeMult),
      0.5,
      "category+material"
    )
  }

  if (bands.length > 0) {
    const avgMin = bands.reduce((s, b) => s + Number(b.priceMin), 0) / bands.length
    const avgMax = bands.reduce((s, b) => s + Number(b.priceMax), 0) / bands.length
    return result(Math.round(avgMin * sizeMult), Math.round(avgMax * sizeMult), 0.35, "category")
  }

  // No reference data for this category at all — a wide, honest default.
  return result(200, 2000, 0.15, "none")
}
