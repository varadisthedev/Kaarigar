"use client"

import * as React from "react"
import { Search, Sparkles, X } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

import { useRouter, usePathname } from "@/i18n/navigation"
import { craftCategories, getCategoryLabel, findCraftCategoryByKeyword } from "@/config/craft-categories"
import { INDIAN_STATES } from "@/core/business/business-code"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = React.useState(props.search ?? "")

  // Auto-detect category from search query
  const detectedCategory = React.useMemo(() => {
    if (!searchValue || searchValue.trim().length < 2) return undefined
    return findCraftCategoryByKeyword(searchValue)
  }, [searchValue])

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

  function handleCategorySelect(catLabelEn: string | undefined) {
    updateParam("category", catLabelEn)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Category selection chips / quick strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => handleCategorySelect(undefined)}
          className={cn(
            "flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            !props.category
              ? "border-primary bg-primary text-primary-foreground shadow-xs"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50"
          )}
        >
          {locale === "mr" ? "सर्व श्रेणी" : locale === "hi" ? "सभी श्रेणियां" : "All Categories"}
        </button>


        {craftCategories.map((c) => {
          const active = props.category === c.labelEn
          const label = getCategoryLabel(c, locale)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCategorySelect(active ? undefined : c.labelEn)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50"
              )}
            >
              <span>{label}</span>
              {active && <X className="size-3 opacity-75" />}
            </button>
          )
        })}
      </div>

      {/* Search and Dropdown Filter Row */}
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

        <Select
          value={props.category ?? ALL}
          onValueChange={(v) => updateParam("category", v === ALL ? undefined : (v as string))}
          items={[
            { value: ALL, label: t("filterCategory") },
            ...craftCategories.map((c) => ({ value: c.labelEn, label: getCategoryLabel(c, locale) })),
          ]}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder={t("filterCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterCategory")}</SelectItem>
            {craftCategories.map((c) => (
              <SelectItem key={c.id} value={c.labelEn}>
                {getCategoryLabel(c, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={props.state ?? ALL}
          onValueChange={(v) => updateParam("state", v === ALL ? undefined : (v as string))}
          items={[{ value: ALL, label: t("filterState") }, ...INDIAN_STATES.map((s) => ({ value: s, label: s }))]}
        >
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

        <Select
          value={props.price ?? ALL}
          onValueChange={(v) => updateParam("price", v === ALL ? undefined : (v as string))}
          items={[
            { value: ALL, label: t("filterPrice") },
            { value: "under-500", label: "Under ₹500" },
            { value: "500-2000", label: "₹500 – ₹2,000" },
            { value: "2000-10000", label: "₹2,000 – ₹10,000" },
            { value: "over-10000", label: "₹10,000+" },
          ]}
        >
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

        <Select
          value={props.moq ?? ALL}
          onValueChange={(v) => updateParam("moq", v === ALL ? undefined : (v as string))}
          items={[
            { value: ALL, label: t("filterMoq") },
            { value: "10", label: "≤ 10" },
            { value: "50", label: "≤ 50" },
            { value: "100", label: "≤ 100" },
          ]}
        >
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

      {/* Auto-category suggestion banner when search term matches a category */}
      {detectedCategory && props.category !== detectedCategory.labelEn && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs text-foreground animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>
              {locale === "mr"
                ? `शोध जुळणारी श्रेणी: `
                : locale === "hi"
                  ? `खोज से मेल खाती श्रेणी: `
                  : `Auto-detected category: `}
              <strong className="font-semibold text-primary">{getCategoryLabel(detectedCategory, locale)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={() => handleCategorySelect(detectedCategory.labelEn)}
            >
              {locale === "mr" ? "श्रेणी लागू करा" : locale === "hi" ? "श्रेणी लागू करें" : "Filter by Category"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleCategorySelect("Other")}
            >
              {locale === "mr" ? "इतर निवडा" : locale === "hi" ? "अन्य चुनें" : "Select Other"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
