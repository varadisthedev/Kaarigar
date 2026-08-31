import "server-only"
import { eq } from "drizzle-orm"

import { getDb } from "../client"
import { users, type NewUser } from "../schema"

export async function findUserByPhone(phoneE164: string) {
  const db = getDb()
  return db.query.users.findFirst({ where: eq(users.phoneE164, phoneE164) })
}

export async function findUserById(id: string) {
  const db = getDb()
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

export async function findUserByEmail(email: string) {
  const db = getDb()
  return db.query.users.findFirst({ where: eq(users.email, email) })
}

export async function createUser(input: NewUser) {
  const db = getDb()
  const [user] = await db.insert(users).values(input).returning()
  return user
}

/** Find-or-create by phone — the core of "sign in with OTP creates an account". */
export async function findOrCreateUserByPhone(input: {
  phoneE164: string
  countryCode: string
  locale?: string
}) {
  const existing = await findUserByPhone(input.phoneE164)
  if (existing) return existing
  return createUser({
    phoneE164: input.phoneE164,
    countryCode: input.countryCode,
    locale: input.locale ?? "en",
  })
}

export async function findUserByUsername(username: string) {
  const db = getDb()
  const clean = username.trim().toLowerCase().replace(/^@/, "")
  return db.query.users.findFirst({ where: eq(users.username, clean) })
}

export async function isUsernameAvailable(username: string, excludeUserId?: string) {
  const existing = await findUserByUsername(username)
  if (!existing) return true
  return excludeUserId ? existing.id === excludeUserId : false
}

export async function updateUserProfile(
  id: string,
  patch: Partial<Pick<NewUser, "name" | "username" | "gender" | "email" | "avatarUrl" | "locale">>
) {
  const db = getDb()
  const [user] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return user
}

/** The one-time profile onboarding step every account completes (name,
 * unique username, gender, avatar, interests, location). Sets `profileCompletedAt`
 * so callers stop redirecting here once done. */
export async function completeOnboarding(
  id: string,
  input: {
    name: string
    username?: string
    gender?: string
    avatarUrl?: string
    state?: string
    district?: string
    latitude?: number
    longitude?: number
    shoppingInterest?: string
  }
) {
  const db = getDb()
  const cleanUsername = input.username?.trim().toLowerCase().replace(/^@/, "")
  const [user] = await db
    .update(users)
    .set({
      name: input.name,
      username: cleanUsername,
      gender: input.gender,
      avatarUrl: input.avatarUrl,
      state: input.state,
      district: input.district,
      latitude: input.latitude != null ? String(input.latitude) : undefined,
      longitude: input.longitude != null ? String(input.longitude) : undefined,
      shoppingInterest: input.shoppingInterest,
      profileCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()
  return user
}

/** Replace (or clear, when both args are null) the avatar. Callers are
 * responsible for deleting the previous Cloudinary asset first — this only
 * updates the pointer. */
export async function setUserAvatar(
  id: string,
  avatar: { url: string; publicId: string } | null
) {
  const db = getDb()
  const [user] = await db
    .update(users)
    .set({
      avatarUrl: avatar?.url ?? null,
      avatarPublicId: avatar?.publicId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()
  return user
}
