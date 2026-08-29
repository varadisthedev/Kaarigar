"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouter, usePathname } from "@/i18n/navigation"
import { craftCategories } from "@/config/craft-categories"
import { INDIAN_STATES } from "@/core/business/business-code"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "__all__"

export function MarketplaceFilters({
  category,
  state,
  search,
}: {
  category?: string
  state?: string
  search?: string
}) {
  const t = useTranslations("marketplace")
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = React.useState(search ?? "")

  function updateParam(key: string, value: string | undefined) {
    const params = new URLSearchParams()
    if (key !== "category" && category) params.set("category", category)
    if (key !== "state" && state) params.set("state", state)
    if (key !== "search" && search) params.set("search", search)
    if (value) params.set(key, value)
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParam("search", searchValue || undefined)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <Select value={category ?? ALL} onValueChange={(v) => updateParam("category", v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder={t("filterCategory")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filterCategory")}</SelectItem>
          {craftCategories.map((c) => (
            <SelectItem key={c.id} value={c.labelEn}>
              {c.labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state ?? ALL} onValueChange={(v) => updateParam("state", v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder={t("filterState")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filterState")}</SelectItem>
          {INDIAN_STATES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
