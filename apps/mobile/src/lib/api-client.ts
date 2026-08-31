import { API_URL } from "./config"
import { clearTokens, getTokens, setTokens } from "./auth-storage"

/** Fires when a session can't be refreshed — screens/layouts subscribe to
 * redirect to login without importing the router here. */
type Listener = () => void
const loggedOutListeners = new Set<Listener>()
export function onLoggedOut(listener: Listener): () => void {
  loggedOutListeners.add(listener)
  return () => loggedOutListeners.delete(listener)
}

let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const tokens = await getTokens()
    if (!tokens) return null
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-client": "native" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
    if (!res.ok) {
      await clearTokens()
      loggedOutListeners.forEach((fn) => fn())
      return null
    }
    const data = await res.json()
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return data.accessToken as string
  })()
  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

/** Thin wrapper around fetch: attaches Bearer + X-Client:native, retries
 * once through /api/auth/refresh on a 401. Mirrors the native-client
 * contract in apps/web/src/infra/http/auth-cookies.ts. */
export async function apiFetch(path: string, init: RequestInit = {}, _retried = false): Promise<Response> {
  const tokens = await getTokens()
  const headers = new Headers(init.headers)
  headers.set("x-client", "native")
  if (tokens?.accessToken) headers.set("authorization", `Bearer ${tokens.accessToken}`)

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (res.status === 401 && !_retried && tokens) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) return apiFetch(path, init, true)
  }

  return res
}
