import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { INDIAN_STATES } from "@/core/business/business-code"

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
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

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    lat: req.nextUrl.searchParams.get("lat") || undefined,
    lng: req.nextUrl.searchParams.get("lng") || undefined,
    pincode: req.nextUrl.searchParams.get("pincode") || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 })
  }

  const { lat, lng, pincode } = parsed.data

  // 1. PIN code lookup if provided
  if (pincode) {
    try {
      const pinRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        headers: { "User-Agent": "Kaarigar/1.0" },
      })
      if (pinRes.ok) {
        const pinData = await pinRes.json()
        if (Array.isArray(pinData) && pinData[0]?.Status === "Success" && pinData[0].PostOffice?.length > 0) {
          const po = pinData[0].PostOffice[0]
          const stateMatch = matchState(po.State)
          return NextResponse.json({
            ok: true,
            state: stateMatch?.state ?? po.State,
            matchedState: stateMatch?.matched ?? false,
            district: po.District || po.Block || po.Name,
            source: "pincode",
          })
        }
      }
    } catch (e) {
      console.warn("[geocode] PIN code lookup error:", e)
    }
  }

  // 2. Lat/Lng Reverse Geocoding via Nominatim
  if (lat != null && lng != null) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: { "User-Agent": "Kaarigar/1.0 (https://kaarigar.app; onboarding location lookup)" },
          signal: AbortSignal.timeout(5000),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const address = data.address ?? {}
        const stateMatch = matchState(address.state)
        const district: string | undefined =
          address.state_district ?? address.county ?? address.city_district ?? address.city ?? undefined

        if (stateMatch?.state || district) {
          return NextResponse.json({
            ok: true,
            state: stateMatch?.state,
            matchedState: stateMatch?.matched ?? false,
            district,
            source: "gps",
          })
        }
      }
    } catch (err) {
      console.warn("[geocode] GPS Nominatim lookup failed, attempting fallback:", err)
    }
  }

  // 3. IP-based location fallback
  try {
    const forwardedFor = req.headers.get("x-forwarded-for")
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : ""
    const ipUrl = clientIp && clientIp !== "::1" && clientIp !== "127.0.0.1"
      ? `https://ipapi.co/${clientIp}/json/`
      : "https://ipapi.co/json/"

    const ipRes = await fetch(ipUrl, {
      headers: { "User-Agent": "Kaarigar/1.0" },
      signal: AbortSignal.timeout(4000),
    })
    if (ipRes.ok) {
      const ipData = await ipRes.json()
      if (ipData.region || ipData.city) {
        const stateMatch = matchState(ipData.region)
        return NextResponse.json({
          ok: true,
          state: stateMatch?.state ?? ipData.region,
          matchedState: stateMatch?.matched ?? false,
          district: ipData.city,
          source: "ip",
        })
      }
    }
  } catch (ipErr) {
    console.warn("[geocode] IP lookup error:", ipErr)
  }

  return NextResponse.json({ ok: false, error: "location_not_found" }, { status: 404 })
}
