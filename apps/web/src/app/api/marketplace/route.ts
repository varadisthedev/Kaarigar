import { NextResponse, type NextRequest } from "next/server"

import { listMarketplaceBusinesses } from "@/infra/db/repositories/business.repository"

/** Read-only catalog listing for clients with no server component to call
 * the repository directly (mirrors apps/web/.../marketplace/page.tsx). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const businesses = await listMarketplaceBusinesses({
    category: sp.get("category") ?? undefined,
    state: sp.get("state") ?? undefined,
    search: sp.get("search") ?? undefined,
  })
  return NextResponse.json({ businesses })
}
