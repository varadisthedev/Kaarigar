import { NextResponse } from "next/server"

import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"
import { getCurrentUser } from "@/infra/http/current-user"

/** The businesses the current user owns — used by clients (mobile, in
 * particular) that have no server component to call the repository
 * directly, unlike apps/web/.../sell/add/page.tsx. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const businesses = await findBusinessesByOwner(user.sub)
  return NextResponse.json({ businesses })
}
