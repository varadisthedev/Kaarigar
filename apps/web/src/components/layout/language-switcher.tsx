"use client"

import { Check, Globe } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { usePathname, useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const LANGUAGES = [
  { code: "en", label: "English", enabled: true },
  { code: "hi", label: "हिन्दी", enabled: true },
  { code: "mr", label: "मराठी", enabled: true },
] as const

/**
 * `variant="compact"` — a small always-visible switcher for the header.
 * `variant="full"` — a labeled section (heading + "changes the whole site"
 * copy + full-height rows) for the nav drawer.
 * `isNavbar={true}` — stylized pill container matching the terracotta navbar theme.
 */
export function LanguageSwitcher({
  variant = "compact",
  isNavbar = false,
}: {
  variant?: "compact" | "full"
  isNavbar?: boolean
}) {
  const locale = useLocale()
  const t = useTranslations("nav")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function switchTo(next: "en" | "hi" | "mr") {
    const qs = searchParams.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: next })
  }

  if (variant === "full") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1">
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t("language")}</span>
        </div>
        <p className="px-1 text-xs text-muted-foreground">{t("languageDescription")}</p>
        <div className="mt-2 flex flex-col gap-1">
          {LANGUAGES.map((lang) => {
            const active = lang.enabled && locale === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                disabled={!lang.enabled}
                onClick={() => lang.enabled && switchTo(lang.code)}
                className={cn(
                  "flex h-12 items-center justify-between border border-border px-4 text-sm rounded-xl transition-colors",
                  active ? "border-primary bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-secondary",
                  !lang.enabled && "text-muted-foreground opacity-60"
                )}
              >
                <span>{lang.label}</span>
                {active && <Check className="size-4 text-primary" />}
                {!lang.enabled && (
                  <span className="border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {tCommon("comingSoon")}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (isNavbar) {
    return (
      <div
        className="relative flex items-center gap-0.5 rounded-full border border-white/25 bg-black/20 p-0.5 shadow-inner"
        aria-label={t("language")}
      >
        {LANGUAGES.map((lang) => {
          const active = lang.enabled && locale === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              disabled={!lang.enabled}
              onClick={() => lang.enabled && switchTo(lang.code)}
              title={!lang.enabled ? tCommon("comingSoon") : undefined}
              className={cn(
                "flex h-7 sm:h-8 items-center rounded-full px-2 sm:px-2.5 text-xs font-semibold transition-all",
                active
                  ? "bg-white text-[#B34726] shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              {lang.code === "en" ? "EN" : lang.code === "hi" ? "हि" : "मर"}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="relative flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/5 p-0.5 shadow-sm shadow-primary/10"
      aria-label={t("language")}
    >
      <span className="absolute -top-1 -right-1 flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 [animation-duration:2.2s]" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          disabled={!lang.enabled}
          onClick={() => lang.enabled && switchTo(lang.code)}
          title={!lang.enabled ? tCommon("comingSoon") : undefined}
          className={cn(
            "flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
            lang.enabled && locale === lang.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : lang.enabled
                ? "text-foreground/70 hover:text-foreground"
                : "text-muted-foreground/50"
          )}
        >
          {lang.code === "en" ? "EN" : lang.code === "hi" ? "हि" : "मर"}
        </button>
      ))}
    </div>
  )
}
