import { NextResponse } from "next/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { getDailyViewsForSeller, getDailyViewsByProductForSeller } from "@/infra/db/repositories/analytics.repository"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const [daily, byProduct] = await Promise.all([
    getDailyViewsForSeller(user.sub),
    getDailyViewsByProductForSeller(user.sub),
  ])

  return NextResponse.json({ daily, byProduct })
}
