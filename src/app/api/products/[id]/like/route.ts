import { NextResponse, type NextRequest } from "next/server"

import { toggleProductLike, findProductById } from "@/infra/db/repositories/business.repository"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

/** Any signed-in buyer or artisan can like a published product — this is
 * open engagement, not an ownership-gated action. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { id } = await params
  const product = await findProductById(id)
  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const result = await toggleProductLike(id, user.sub)
  return NextResponse.json({ ok: true, ...result })
}
