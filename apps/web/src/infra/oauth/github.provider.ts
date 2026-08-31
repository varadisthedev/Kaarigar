import "server-only"
import { env } from "@/config/env"
import type { OAuthProvider } from "@/core/auth/oauth-ports"

/** Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps */
export const githubOAuthProvider: OAuthProvider = {
  name: "github",

  buildAuthUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "user-agent": "Kaarigar-App",
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID!,
        client_secret: env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!res.ok) {
      throw new Error(`github token exchange failed: ${res.status} ${await res.text().catch(() => "")}`)
    }
    const data = await res.json()
    if (!data.access_token) {
      throw new Error(`github token exchange returned no token: ${JSON.stringify(data)}`)
    }
    return { accessToken: data.access_token as string }
  },

  async fetchProfile(accessToken) {
    const headers = {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "user-agent": "Kaarigar-App",
    }

    const userRes = await fetch("https://api.github.com/user", { headers })
    if (!userRes.ok) {
      throw new Error(`github user fetch failed: ${userRes.status}`)
    }
    const user = await userRes.json()

    // GitHub only includes `email` on /user when the user has made one
    // public — otherwise it's null and a separate, scope-gated call is
    // needed to find their verified primary address.
    let email: string | null = user.email ?? null
    let emailVerified = Boolean(email)
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers })
      if (emailsRes.ok) {
        const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json()
        const primary = emails.find((e) => e.primary) ?? emails.find((e) => e.verified)
        if (primary) {
          email = primary.email
          emailVerified = primary.verified
        }
      }
    }

    return {
      providerAccountId: String(user.id),
      email,
      emailVerified,
      name: (user.name as string) ?? (user.login as string) ?? null,
      avatarUrl: (user.avatar_url as string) ?? null,
    }
  },
}
