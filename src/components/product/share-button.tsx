"use client"

import * as React from "react"
import { Share2, Check } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/** Native share sheet where available (mobile), clipboard-copy fallback
 * everywhere else — no share targets or accounts of our own to wire up. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const t = useTranslations("sell")
  const [copied, setCopied] = React.useState(false)

  async function share(e: React.MouseEvent) {
    e.preventDefault()
    const fullUrl = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl })
        return
      } catch {
        // user cancelled the native share sheet — fall through to nothing
        return
      }
    }

    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked — nothing more we can do without a fallback UI
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? t("linkCopied") : t("share")}
    </button>
  )
}
