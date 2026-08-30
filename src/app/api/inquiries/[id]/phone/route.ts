import { NextResponse } from "next/server"

import { revealCounterpartyPhone } from "@/core/messaging/messaging.service"
import { getCurrentUser } from "@/infra/http/current-user"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { id } = await params
  const result = await revealCounterpartyPhone(id, user.sub)
  if (!result.ok) {
    const status = result.error === "forbidden" ? 403 : result.error === "not_found" ? 404 : 409
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ phoneE164: result.phoneE164 })
}
