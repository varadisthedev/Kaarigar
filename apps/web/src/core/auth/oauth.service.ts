import "server-only"

import { findOAuthAccount, createOAuthAccount } from "@/infra/db/repositories/oauth.repository"
import { findUserByEmail, findUserById, createUser } from "@/infra/db/repositories/users.repository"
import type { OAuthProfile } from "./oauth-ports"
import type { User } from "@/infra/db/schema"

/**
 * Resolves an OAuth callback to a user account, in priority order:
 *   1. This exact (provider, providerAccountId) is already linked -> that user.
 *   2. A verified email matches an existing account (phone-only or another
 *      OAuth provider) -> link this provider to it, same account. Only done
 *      when the provider itself reports the email as verified — an
 *      unverified email is not a safe signal to merge accounts on.
 *   3. Otherwise -> a brand-new account. Defaults to role='buyer': someone
 *      arriving via Google/GitHub is far more likely to be a business buyer
 *      than the low-literacy artisan this app is primarily designed for
 *      (who onboards by voice, not OAuth) — but nothing stops them from
 *      registering a business afterward; role isn't a hard gate anywhere
 *      except /admin.
 */
export async function findOrCreateUserFromOAuth(
  provider: "google" | "github",
  profile: OAuthProfile
): Promise<User> {
  const existingLink = await findOAuthAccount(provider, profile.providerAccountId)
  if (existingLink) {
    const user = await findUserById(existingLink.userId)
    if (user) return user
    // Orphaned link (user row deleted) — fall through and create fresh.
  }

  if (profile.email && profile.emailVerified) {
    const existingUser = await findUserByEmail(profile.email)
    if (existingUser) {
      await createOAuthAccount({
        userId: existingUser.id,
        provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
      })
      return existingUser
    }
  }

  const newUser = await createUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    role: "buyer",
    locale: "en",
  })

  await createOAuthAccount({
    userId: newUser.id,
    provider,
    providerAccountId: profile.providerAccountId,
    email: profile.email,
  })

  return newUser
}
