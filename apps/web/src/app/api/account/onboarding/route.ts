import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { completeOnboarding, isUsernameAvailable } from "@/infra/db/repositories/users.repository"
import { getCurrentUser } from "@/infra/http/current-user"
import { requireCsrf } from "@/infra/http/csrf"
import { isNativeClient } from "@/infra/http/auth-cookies"

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  username: z.string().min(2).max(60).regex(/^[a-zA-Z0-9_.]+$/).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).default("prefer_not_to_say"),
  avatarUrl: z.string().max(2048).optional(),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  shoppingInterest: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  if (!isNativeClient(req) && !requireCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", details: parsed.error.format() }, { status: 400 })

  const data = parsed.data
  let finalUsername = data.username?.trim().toLowerCase().replace(/^@/, "")

  // Auto-generate username from name if not provided
  if (!finalUsername) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)
    finalUsername = `${slug}_${Math.floor(1000 + Math.random() * 9000)}`
  }

  // Check username uniqueness
  const available = await isUsernameAvailable(finalUsername, user.sub)
  if (!available) {
    return NextResponse.json({ error: "username_taken", message: "This username is already taken. Please choose another." }, { status: 409 })
  }

  // Assign default avatar if none supplied
  let finalAvatarUrl = data.avatarUrl
  if (!finalAvatarUrl) {
    finalAvatarUrl = data.gender === "female" ? "/avatars/female.svg" : "/avatars/male.svg"
  }

  await completeOnboarding(user.sub, {
    ...data,
    username: finalUsername,
    avatarUrl: finalAvatarUrl,
  })

  return NextResponse.json({ ok: true, username: finalUsername, avatarUrl: finalAvatarUrl })
}
