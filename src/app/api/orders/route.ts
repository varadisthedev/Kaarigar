import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createOrderFromInquiry } from "@/core/payments/order.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({
  inquiryId: z.string().uuid(),
  totalAmount: z.number().positive(),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const result = await createOrderFromInquiry({ ...parsed.data, buyerId: user.sub })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "forbidden" ? 403 : 404 })
  }

  return NextResponse.json({ ok: true, order: result.order })
}
