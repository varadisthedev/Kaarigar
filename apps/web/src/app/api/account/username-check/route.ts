import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { isUsernameAvailable } from "@/infra/db/repositories/users.repository"
import { getCurrentUser } from "@/infra/http/current-user"

const querySchema = z.object({
  username: z.string().min(2).max(60).regex(/^[a-zA-Z0-9_.]+$/),
})

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim().toLowerCase().replace(/^@/, "")
  const parsed = querySchema.safeParse({ username })
  if (!parsed.success) {
    return NextResponse.json({ available: false, error: "invalid_username" }, { status: 400 })
  }

  const user = await getCurrentUser()
  const available = await isUsernameAvailable(parsed.data.username, user?.sub)

  return NextResponse.json({ available, username: parsed.data.username })
}
