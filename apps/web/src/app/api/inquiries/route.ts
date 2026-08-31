import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createInquiry, listInquiriesForUser } from "@/infra/db/repositories/inquiries.repository"
import { createMessage } from "@/infra/db/repositories/messages.repository"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({
  businessId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
  targetPrice: z.number().positive().optional(),
  message: z.string().min(1).max(2000),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const inquiries = await listInquiriesForUser(user.sub)
  return NextResponse.json({ inquiries })
}

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const inquiry = await createInquiry({
    businessId: parsed.data.businessId,
    productId: parsed.data.productId,
    buyerId: user.sub,
    quantity: parsed.data.quantity != null ? String(parsed.data.quantity) : undefined,
    targetPrice: parsed.data.targetPrice != null ? String(parsed.data.targetPrice) : undefined,
    message: parsed.data.message,
  })

  // The initial pitch also opens the chat thread, so a seller sees it in
  // context rather than as a disconnected field.
  await createMessage({ inquiryId: inquiry.id, senderId: user.sub, body: parsed.data.message })

  return NextResponse.json({ ok: true, inquiry })
}
