"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { formatInr } from "@/lib/format"
import { TalkingPrompt } from "./talking-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ProductPriceStep({
  locale,
  craftCategory,
  region,
  material,
  descriptionEn,
  onContinue,
}: {
  locale: "en" | "hi"
  /** When present, fetches a market price suggestion the artisan can apply with one tap. */
  craftCategory?: string
  region?: string
  material?: string
  descriptionEn?: string
  onContinue: (result: { priceMin?: number; priceMax?: number }) => void
}) {
  const t = useTranslations("onboarding")
  const tSell = useTranslations("sell")
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [suggestion, setSuggestion] = React.useState<{ min: number; max: number } | null>(null)
  const [suggestionLoading, setSuggestionLoading] = React.useState(false)

  React.useEffect(() => {
    if (!craftCategory) return
    let cancelled = false

    async function fetchSuggestion() {
      setSuggestionLoading(true)
      try {
        const res = await apiFetch("/api/pricing/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ category: craftCategory, material, region, descriptionEn, locale }),
        })
        const data = res.ok ? await res.json() : null
        if (!cancelled && data) setSuggestion({ min: data.min, max: data.max })
      } finally {
        if (!cancelled) setSuggestionLoading(false)
      }
    }

    fetchSuggestion()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craftCategory])

  return (
    <div className="flex flex-col gap-6">
      <TalkingPrompt promptKey="promptProductPrice" locale={locale} text={t("promptProductPrice")} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-min">{tSell("priceMin")}</Label>
          <Input id="price-min" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-max">{tSell("priceMax")}</Label>
          <Input id="price-max" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        </div>
      </div>
      {suggestionLoading && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3" /> {tSell("gettingSuggestion")}
        </p>
      )}
      {suggestion && (
        <button
          type="button"
          onClick={() => {
            setPriceMin(String(suggestion.min))
            setPriceMax(String(suggestion.max))
          }}
          className="flex items-center gap-1.5 self-start text-xs text-primary hover:underline"
        >
          <Sparkles className="size-3" />
          {formatInr(suggestion.min)} – {formatInr(suggestion.max)} · {tSell("usePriceSuggestion")}
        </button>
      )}
      <Button
        className="w-full"
        onClick={() =>
          onContinue({
            priceMin: priceMin ? Number(priceMin) : undefined,
            priceMax: priceMax ? Number(priceMax) : undefined,
          })
        }
      >
        {t("qnaNext")}
      </Button>
    </div>
  )
}
