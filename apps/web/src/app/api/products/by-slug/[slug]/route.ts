import { NextResponse, type NextRequest } from "next/server"

import {
  findProductBySlug,
  incrementProductViewCount,
  hasUserLikedProduct,
} from "@/infra/db/repositories/business.repository"
import { getCurrentUser } from "@/infra/http/current-user"

/** Read-only product detail for clients with no server component to call
 * the repository directly (mirrors apps/web/.../product/[slug]/page.tsx). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await findProductBySlug(slug)
  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const user = await getCurrentUser()
  const liked = user ? await hasUserLikedProduct(product.id, user.sub) : false
  await incrementProductViewCount(product.id)

  return NextResponse.json({ product, liked })
}
