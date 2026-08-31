import "server-only"
import { and, eq } from "drizzle-orm"

import { getDb } from "../client"
import { oauthAccounts, type NewOAuthAccount } from "../schema"

export async function findOAuthAccount(provider: "google" | "github", providerAccountId: string) {
  const db = getDb()
  return db.query.oauthAccounts.findFirst({
    where: and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, providerAccountId)),
  })
}

export async function createOAuthAccount(input: NewOAuthAccount) {
  const db = getDb()
  const [account] = await db.insert(oauthAccounts).values(input).returning()
  return account
}
