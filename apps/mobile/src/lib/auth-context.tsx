import * as React from "react"

import { apiFetch, onLoggedOut } from "./api-client"
import { clearTokens, getTokens, setTokens } from "./auth-storage"
import { API_URL } from "./config"

export type SessionUser = {
  id: string
  name: string | null
  role: "artisan" | "buyer" | "admin"
  locale: "en" | "hi"
}

type AuthState = {
  user: SessionUser | null
  loading: boolean
  requestOtp: (phoneE164: string) => Promise<{ ok: boolean; devCode?: string; error?: string }>
  verifyOtp: (args: {
    phoneE164: string
    countryCode: string
    code: string
  }) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refreshMe = React.useCallback(async () => {
    const res = await apiFetch("/api/auth/me")
    const data = await res.json().catch(() => ({ user: null }))
    setUser(data.user ?? null)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const tokens = await getTokens()
      if (tokens && !cancelled) await refreshMe()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshMe])

  React.useEffect(() => onLoggedOut(() => setUser(null)), [])

  const requestOtp = React.useCallback(async (phoneE164: string) => {
    const res = await fetch(`${API_URL}/api/auth/otp/request`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-client": "native" },
      body: JSON.stringify({ phoneE164, purpose: "login" }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error ?? "unknown_error" }
    return { ok: true, devCode: data.devCode }
  }, [])

  const verifyOtp = React.useCallback(
    async ({ phoneE164, countryCode, code }: { phoneE164: string; countryCode: string; code: string }) => {
      const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-client": "native" },
        body: JSON.stringify({ phoneE164, countryCode, code, purpose: "login" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error ?? "unknown_error" }
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      setUser(data.user)
      return { ok: true }
    },
    []
  )

  const logout = React.useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    await clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
