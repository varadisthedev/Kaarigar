import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { initiateAdvancePayment } from "@/core/payments/order.service"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({ orderId: z.string().uuid() })

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const result = await initiateAdvancePayment({ orderId: parsed.data.orderId, buyerId: user.sub })
  if (!result.ok) {
    const status = result.error === "not_configured" ? 503 : result.error === "forbidden" ? 403 : 404
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json(result)
}
