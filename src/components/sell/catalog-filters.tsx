"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouter, usePathname } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Filters = {
  q?: string
  sort?: string
}

export function CatalogFilters(props: Filters) {
  const t = useTranslations("sell")
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = React.useState(props.q ?? "")

  function updateParam(key: keyof Filters, value: string | undefined) {
    const params = new URLSearchParams()
    for (const k of ["q", "sort"] as const) {
      if (k === key) continue
      const v = props[k]
      if (v) params.set(k, v)
    }
    if (value) params.set(key, value)
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`)
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue !== (props.q ?? "")) updateParam("q", searchValue || undefined)
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <Select value={props.sort ?? "newest"} onValueChange={(v) => updateParam("sort", v === "newest" ? undefined : (v as string))}>
        <SelectTrigger className="sm:w-52">
          <SelectValue placeholder={t("sortNewest")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t("sortNewest")}</SelectItem>
          <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
          <SelectItem value="priceAsc">{t("sortPriceLowHigh")}</SelectItem>
          <SelectItem value="priceDesc">{t("sortPriceHighLow")}</SelectItem>
          <SelectItem value="views">{t("sortMostViewed")}</SelectItem>
          <SelectItem value="likes">{t("sortMostLiked")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
