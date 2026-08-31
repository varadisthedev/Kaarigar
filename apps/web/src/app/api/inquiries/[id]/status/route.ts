import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { respondToInquiry } from "@/core/messaging/messaging.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({ decision: z.enum(["accepted", "declined"]) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const { id } = await params
  const result = await respondToInquiry({ inquiryId: id, sellerId: user.sub, decision: parsed.data.decision })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : result.error === "not_found" ? 404 : 409 })
  }

  return NextResponse.json({ ok: true, inquiry: result.inquiry })
}
