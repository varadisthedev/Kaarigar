import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { rejectBusinessSubmission } from "@/core/business/review.service"
import { requireAdmin } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({ reason: z.string().min(3).max(1000) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const { id } = await params
  const result = await rejectBusinessSubmission(id, admin.sub, parsed.data.reason)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 409 })
  }

  return NextResponse.json({ ok: true, business: result.business })
}
