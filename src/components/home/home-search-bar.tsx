"use client"

import * as React from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouter } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Routes into the marketplace's own search/filter UI rather than
 * duplicating filtering logic here — this is just the entry point. */
export function HomeSearchBar() {
  const t = useTranslations("marketplace")
  const router = useRouter()
  const [value, setValue] = React.useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.push(value ? `/marketplace?search=${encodeURIComponent(value)}` : "/marketplace")
  }

  return (
    <form onSubmit={submit} className="flex flex-1 items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>
      <button
        type="button"
        onClick={() => router.push("/marketplace")}
        className={cn(buttonVariants({ variant: "outline", size: "default" }), "shrink-0 gap-1.5")}
      >
        <SlidersHorizontal className="size-4" />
        <span className="hidden sm:inline">{t("filters")}</span>
      </button>
    </form>
  )
}
