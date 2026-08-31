/**
 * Guards every post-login redirect target (`next`) that ultimately comes
 * from a query string — the OAuth `/start` route reads it straight off the
 * request, and the `/callback` route reads it back from a cookie that
 * `/start` itself set from that same untrusted input. Without this, a
 * crafted link like `/api/auth/oauth/google/start?next=https://evil.com`
 * (or the schema-relative `//evil.com`, which browsers also treat as a full
 * URL) would complete a real Google/GitHub login and then hand the victim
 * off to an attacker-controlled page — a classic open-redirect, and a
 * convincing phishing vector precisely because the login itself was real.
 *
 * Only a same-origin, single-leading-slash relative path is accepted;
 * anything else falls back to the caller-supplied default.
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback
  if (!path.startsWith("/")) return fallback // rejects absolute URLs (https://evil.com, javascript:, etc.)
  if (path.startsWith("//")) return fallback // protocol-relative (//evil.com) — browsers resolve this to a full URL
  if (path.startsWith("/\\")) return fallback // backslash variant some browsers still normalize to //
  return path
}

/**
 * A sanitized `next` path is always locale-prefixed (it's built from
 * `req.nextUrl.pathname`, or from a `/${locale}` fallback) — required by the
 * OAuth callback route, which hands it straight to a raw
 * `NextResponse.redirect`. next-intl's locale-aware `router.push` from
 * `@/i18n/navigation` expects the *opposite*: an unprefixed pathname, since
 * it prepends the current locale itself. Passing an already-prefixed path
 * to it double-prefixes (`/en` + `/en/sell/add` -> `/en/en/sell/add`) — strip
 * it first whenever `next` is going through that router instead of a raw
 * redirect.
 */
export function stripLocalePrefix(path: string, locale: string): string {
  const prefix = `/${locale}`
  if (path === prefix) return "/"
  if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length)
  return path
}
