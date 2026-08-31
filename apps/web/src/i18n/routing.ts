import { defineRouting } from "next-intl/routing"

/**
 * Both locales are always prefixed (/en/..., /hi/...) — including the
 * default — so every product/business page is indexable per-language, which
 * is what the SEO-friendly-cataloging requirement in the problem statement
 * actually needs. A bare `/` is redirected to `/en` by the middleware.
 */
export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
  localePrefix: "always",
})

export type AppLocale = (typeof routing.locales)[number]
