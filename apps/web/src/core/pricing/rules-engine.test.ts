import { describe, it, expect } from "vitest"
import { scoreWithRulesEngine } from "./rules-engine"
import type { PriceReference } from "@/infra/db/schema"

function band(overrides: Partial<PriceReference>): PriceReference {
  return {
    id: "test-id",
    craftCategory: "Block Printing",
    material: "cotton",
    sizeBand: "medium",
    region: "Gujarat",
    priceMin: "250.00",
    priceMax: "450.00",
    createdAt: new Date(),
    ...overrides,
  }
}

describe("scoreWithRulesEngine", () => {
  it("matches on material+region with the highest confidence", () => {
    const bands = [band({})]
    const result = scoreWithRulesEngine(
      { category: "Block Printing", material: "cotton", sizeBand: "medium", region: "Gujarat" },
      bands
    )
    expect(result.matchedOn).toBe("category+material+region")
    expect(result.confidence).toBeGreaterThan(0.5)
    expect(result.min).toBe(250)
    expect(result.max).toBe(450)
    expect(result.price).toBe(350) // midpoint of 250-450
  })

  it("scales the range by size band", () => {
    const bands = [band({})]
    const small = scoreWithRulesEngine(
      { category: "Block Printing", material: "cotton", sizeBand: "small", region: "Gujarat" },
      bands
    )
    const large = scoreWithRulesEngine(
      { category: "Block Printing", material: "cotton", sizeBand: "large", region: "Gujarat" },
      bands
    )
    expect(small.max).toBeLessThan(large.max)
  })

  it("falls back to a material-only match with lower confidence when region differs", () => {
    const bands = [band({ region: "Rajasthan" })]
    const result = scoreWithRulesEngine(
      { category: "Block Printing", material: "cotton", sizeBand: "medium", region: "Gujarat" },
      bands
    )
    expect(result.matchedOn).toBe("category+material")
  })

  it("averages across bands when nothing matches material/region", () => {
    const bands = [band({ material: "silk", region: "Uttar Pradesh", priceMin: "4500.00", priceMax: "12000.00" })]
    const result = scoreWithRulesEngine(
      { category: "Block Printing", material: "cotton", sizeBand: "medium", region: "Gujarat" },
      bands
    )
    expect(result.matchedOn).toBe("category")
    expect(result.confidence).toBeLessThan(0.5)
  })

  it("returns a wide, low-confidence default with zero reference bands", () => {
    const result = scoreWithRulesEngine(
      { category: "Glass Blowing", sizeBand: "medium" },
      []
    )
    expect(result.matchedOn).toBe("none")
    expect(result.confidence).toBeLessThan(0.2)
    expect(result.max).toBeGreaterThan(result.min)
  })
})
