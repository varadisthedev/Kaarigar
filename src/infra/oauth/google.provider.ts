import "server-only"
import { env } from "@/config/env"
import type { OAuthProvider } from "@/core/auth/oauth-ports"

/** Docs: https://developers.google.com/identity/protocols/oauth2/web-server */
export const googleOAuthProvider: OAuthProvider = {
  name: "google",

  buildAuthUrl({ state, redirectUri }) {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })
    if (!res.ok) {
      throw new Error(`google token exchange failed: ${res.status} ${await res.text().catch(() => "")}`)
    }
    const data = await res.json()
    return { accessToken: data.access_token as string }
  },

  async fetchProfile(accessToken) {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      throw new Error(`google userinfo fetch failed: ${res.status}`)
    }
    const data = await res.json()
    return {
      providerAccountId: data.sub as string,
      email: (data.email as string) ?? null,
      emailVerified: Boolean(data.email_verified),
      name: (data.name as string) ?? null,
      avatarUrl: (data.picture as string) ?? null,
    }
  },
}
