/**
 * Client-side fetch wrapper that echoes the CSRF cookie back as a header on
 * every mutating request — the other half of the double-submit pattern in
 * `infra/http/csrf.ts`. Use this instead of raw `fetch` for any POST/PUT/
 * PATCH/DELETE call from a client component.
 */
function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)cm_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase()
  const headers = new Headers(init.headers)

  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCsrfCookie()
    if (csrf) headers.set("x-csrf-token", csrf)
  }

  return fetch(input, { ...init, headers, credentials: "same-origin" })
}
