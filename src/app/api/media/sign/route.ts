import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { signUpload } from "@/infra/storage/cloudinary.client"
import { getCurrentUser } from "@/infra/http/current-user"
import { isNativeClient } from "@/infra/http/auth-cookies"
import { requireCsrf } from "@/infra/http/csrf"

const bodySchema = z.object({
  kind: z.enum(["onboarding_photo", "avatar", "product_photo"]),
  draftId: z.string().min(1).max(64).optional(),
})

/**
 * The client never sees the Cloudinary API secret — it gets a signed
 * timestamp+folder+signature here and uploads directly to Cloudinary with
 * those. The folder (and therefore where a file can land) is decided
 * server-side from `kind`, never from client-supplied input, so an artisan
 * can't write into another user's avatar folder.
 */
export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }
  const { kind, draftId } = parsed.data

  let folder: string
  if (kind === "onboarding_photo") {
    if (!draftId) return NextResponse.json({ error: "draft_id_required" }, { status: 400 })
    folder = `craftmate/onboarding/${draftId}`
  } else {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
    folder = kind === "avatar" ? `craftmate/avatars/${user.sub}` : `craftmate/products/${user.sub}`
  }

  try {
    const signed = signUpload({ folder })
    return NextResponse.json(signed)
  } catch (err) {
    console.error("[media/sign]", err)
    return NextResponse.json({ error: "cloudinary_not_configured" }, { status: 503 })
  }
}
