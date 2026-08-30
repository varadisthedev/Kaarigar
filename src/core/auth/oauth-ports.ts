/**
 * OAuth is additive to phone/OTP, not a replacement — signing in this way
 * still lands the user in the exact same session system (`session.service.ts`
 * issues the same JWT + refresh cookies either way). Each provider is a
 * thin adapter behind this port; `oauth.service.ts` never talks to
 * Google/GitHub's APIs directly.
 */
export type OAuthProfile = {
  providerAccountId: string
  email: string | null
  emailVerified: boolean
  name: string | null
  avatarUrl: string | null
}

export interface OAuthProvider {
  readonly name: "google" | "github"
  buildAuthUrl(input: { state: string; redirectUri: string }): string
  exchangeCode(input: { code: string; redirectUri: string }): Promise<{ accessToken: string }>
  fetchProfile(accessToken: string): Promise<OAuthProfile>
}
