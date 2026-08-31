"use client"

import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouter, Link } from "@/i18n/navigation"

/** Real browser-history back (not a hardcoded destination) — falls back to
 * the marketplace only when there's no in-app history to return to (e.g.
 * the product was opened directly from an external share link). */
export function BackButton({ fallbackHref = "/marketplace" }: { fallbackHref?: string }) {
  const t = useTranslations("common")
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault()
      router.back()
    }
  }

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {t("back")}
    </Link>
  )
}
