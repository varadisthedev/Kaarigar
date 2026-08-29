"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function switchTo(next: "en" | "hi") {
    const qs = searchParams.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: next })
  }

  return (
    <div className="flex items-center border border-border text-xs">
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`px-2 py-1 ${locale === "en" ? "bg-foreground text-background" : "text-muted-foreground"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("hi")}
        className={`px-2 py-1 ${locale === "hi" ? "bg-foreground text-background" : "text-muted-foreground"}`}
      >
        हि
      </button>
    </div>
  )
}
