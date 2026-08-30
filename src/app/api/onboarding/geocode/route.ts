import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { INDIAN_STATES } from "@/core/business/business-code"

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

function matchState(raw: string | undefined): { state: string; matched: boolean } | null {
  if (!raw) return null
  const needle = raw.trim().toLowerCase()
  const exact = INDIAN_STATES.find((s) => s.toLowerCase() === needle)
  if (exact) return { state: exact, matched: true }
  const contains = INDIAN_STATES.find((s) => needle.includes(s.toLowerCase()) || s.toLowerCase().includes(needle))
  if (contains) return { state: contains, matched: true }
  return { state: raw, matched: false }
}

/**
 * Server-side proxy to OpenStreetMap Nominatim's free reverse-geocoding
 * endpoint — no API key needed, but their usage policy requires a
 * descriptive User-Agent and discourages unproxied client-side calls, so
 * this route exists purely to satisfy that (and sidestep CORS) rather than
 * hitting Nominatim straight from the browser.
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    lat: req.nextUrl.searchParams.get("lat"),
    lng: req.nextUrl.searchParams.get("lng"),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 })
  }
  const { lat, lng } = parsed.data

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { "User-Agent": "Kaarigar/1.0 (https://kaarigar.app; onboarding location lookup)" } }
    )
    if (!res.ok) return NextResponse.json({ error: "geocode_failed" }, { status: 502 })

    const data = await res.json()
    const address = data.address ?? {}
    const stateMatch = matchState(address.state)
    const district: string | undefined =
      address.state_district ?? address.county ?? address.city_district ?? address.city ?? undefined

    return NextResponse.json({
      ok: true,
      state: stateMatch?.state,
      matchedState: stateMatch?.matched ?? false,
      district,
    })
  } catch (err) {
    console.error("[onboarding/geocode]", err)
    return NextResponse.json({ error: "geocode_failed" }, { status: 502 })
  }
}
