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

type Filters = {
  category?: string
  state?: string
  search?: string
  price?: string
  moq?: string
}

export function MarketplaceFilters(props: Filters) {
  const t = useTranslations("marketplace")
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = React.useState(props.search ?? "")

  function updateParam(key: keyof Filters, value: string | undefined) {
    const params = new URLSearchParams()
    for (const k of ["category", "state", "search", "price", "moq"] as const) {
      if (k === key) continue
      const v = props[k]
      if (v) params.set(k, v)
    }
    if (value) params.set(key, value)
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-48">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParam("search", searchValue || undefined)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <Select value={props.category ?? ALL} onValueChange={(v) => updateParam("category", v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-44">
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

      <Select value={props.state ?? ALL} onValueChange={(v) => updateParam("state", v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-40">
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

      <Select value={props.price ?? ALL} onValueChange={(v) => updateParam("price", v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder={t("filterPrice")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filterPrice")}</SelectItem>
          <SelectItem value="under-500">Under ₹500</SelectItem>
          <SelectItem value="500-2000">₹500 – ₹2,000</SelectItem>
          <SelectItem value="2000-10000">₹2,000 – ₹10,000</SelectItem>
          <SelectItem value="over-10000">₹10,000+</SelectItem>
        </SelectContent>
      </Select>

      <Select value={props.moq ?? ALL} onValueChange={(v) => updateParam("moq", v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-36">
          <SelectValue placeholder={t("filterMoq")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filterMoq")}</SelectItem>
          <SelectItem value="10">≤ 10</SelectItem>
          <SelectItem value="50">≤ 50</SelectItem>
          <SelectItem value="100">≤ 100</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
