import "server-only"
import { env, features } from "@/config/env"

export type MlPricePrediction = { min: number; max: number; confidence: number; topFeatures: string[] }

/** Returns null (never throws) when the ML service is unconfigured,
 * unreachable, or slow — `pricing.service.ts` treats that as "fall through
 * to the rules engine", not an error. */
export async function predictPriceViaMlService(input: {
  category: string
  material?: string
  sizeBand: "small" | "medium" | "large"
  region?: string
  leadTimeDays: number
  experienceYears: number
}): Promise<MlPricePrediction | null> {
  if (!features.mlService) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.ML_SERVICE_TIMEOUT_MS)

  try {
    const res = await fetch(`${env.ML_SERVICE_URL}/price/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        category: input.category,
        material: input.material,
        size_band: input.sizeBand,
        region: input.region,
        lead_time_days: input.leadTimeDays,
        experience_years: input.experienceYears,
      }),
    })
    if (!res.ok) return null

    const data = await res.json()
    return { min: data.min, max: data.max, confidence: data.confidence, topFeatures: data.top_features ?? [] }
  } catch (err) {
    console.error("[ml-service] price prediction failed, falling back:", err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}
