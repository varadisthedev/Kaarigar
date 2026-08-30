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

export async function updateUserProfile(
  id: string,
  patch: Partial<Pick<NewUser, "name" | "email" | "locale">>
) {
  const db = getDb()
  const [user] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
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
