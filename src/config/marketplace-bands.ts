/**
 * Plain data — deliberately NOT in marketplace-filters.tsx (a "use client"
 * file). Importing a non-component export from a "use client" module into a
 * Server Component gets you a client-reference stub, not the real object —
 * `"under-500" in PRICE_BANDS` silently evaluates false there even though it
 * looks correct. Shared constants used by both a client and a server module
 * need their own client-directive-free file.
 */
export const PRICE_BANDS: Record<string, { min?: number; max?: number }> = {
  "under-500": { max: 500 },
  "500-2000": { min: 500, max: 2000 },
  "2000-10000": { min: 2000, max: 10000 },
  "over-10000": { min: 10000 },
}

export const MOQ_BANDS: Record<string, number> = { "10": 10, "50": 50, "100": 100 }
