"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Sparkles, IndianRupee, Loader2, ArrowRight } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { formatInr } from "@/lib/format"
import { TalkingPrompt } from "./talking-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

type Suggestion = { price: number; marketMin: number; marketMax: number }

export function ProductPriceStep({
  locale,
  craftCategory,
  region,
  material,
  descriptionEn,
  onContinue,
}: {
  locale: "en" | "hi" | "mr"
  /** When present, fetches a market price suggestion the artisan can apply with one tap. */
  craftCategory?: string
  region?: string
  material?: string
  descriptionEn?: string
  onContinue: (result: { priceMin?: number; priceMax?: number }) => void
}) {
  const t = useTranslations("onboarding")
  const tSell = useTranslations("sell")
  const [price, setPrice] = React.useState("")
  const [materialCost, setMaterialCost] = React.useState("")
  const [suggestion, setSuggestion] = React.useState<Suggestion | null>(null)
  const [suggestionLoading, setSuggestionLoading] = React.useState(false)

  const fetchSuggestion = React.useCallback(async (isManual = false) => {
    if (!craftCategory) return
    setSuggestionLoading(true)
    try {
      const res = await apiFetch("/api/pricing/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: craftCategory,
          material,
          region,
          descriptionEn,
          materialCost: materialCost ? Number(materialCost) : undefined,
          locale,
        }),
      })
      const data = res.ok ? await res.json() : null
      if (data && data.price) {
        setSuggestion({ price: data.price, marketMin: data.marketMin, marketMax: data.marketMax })
        // If price is currently empty, prefill suggested price
        setPrice((prev) => (prev ? prev : String(data.price)))
        if (isManual) {
          toast.success("AI market rates estimated!", `Suggested: ${formatInr(data.price)}`)
        }
      }
    } finally {
      setSuggestionLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craftCategory, materialCost, locale])

  React.useEffect(() => {
    fetchSuggestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craftCategory])

  function handleContinue() {
    const num = price ? Number(price) : undefined
    onContinue({
      priceMin: num,
      priceMax: num,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <TalkingPrompt promptKey="promptProductPrice" locale={locale} text={t("promptProductPrice")} />

      {/* AI Market Rate Suggestion Box */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {locale === "mr"
                  ? "AI बाजार भाव अंदाज"
                  : locale === "hi"
                    ? "AI बाज़ार मूल्य अनुमान"
                    : "AI Market Price Suggestion"}
              </p>
              {suggestionLoading ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin text-primary" />
                  {tSell("gettingSuggestion")}
                </p>
              ) : suggestion ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-primary">{formatInr(suggestion.price)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({tSell("marketRange")}: {formatInr(suggestion.marketMin)} – {formatInr(suggestion.marketMax)})
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {locale === "mr"
                    ? "किफायतशीर किंमत मिळवण्यासाठी कच्च्या मालाचा खर्च टाका."
                    : locale === "hi"
                      ? "उचित मूल्य पाने के लिए कच्चे माल की लागत दर्ज करें।"
                      : "Enter raw material cost to refine market pricing."}
                </p>
              )}
            </div>
          </div>

          {suggestion && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPrice(String(suggestion.price))
                toast.success("Applied suggested price!", formatInr(suggestion.price))
              }}
              className="h-8 text-xs font-medium"
            >
              {locale === "mr" ? "किंमत वापरा" : locale === "hi" ? "मूल्य चुनें" : "Apply Price"}
            </Button>
          )}
        </div>

        {/* Material Cost Input */}
        <div className="mt-4 border-t border-primary/10 pt-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <Label htmlFor="material-cost" className="text-xs font-medium text-muted-foreground sm:min-w-36">
              {tSell("materialCost")} (₹):
            </Label>
            <div className="flex flex-1 gap-2">
              <Input
                id="material-cost"
                inputMode="numeric"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                placeholder={tSell("materialCostPlaceholder")}
                className="h-9 text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fetchSuggestion(true)}
                disabled={suggestionLoading}
                className="h-9 text-xs"
              >
                {tSell("recalculate")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Single Product Price Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-price" className="text-sm font-medium">
          {locale === "mr" ? "उत्पादन किंमत (₹)" : locale === "hi" ? "उत्पाद मूल्य (₹)" : "Product Price (₹)"}
        </Label>
        <div className="relative">
          <IndianRupee className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="product-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 1200"
            className="h-12 pl-9 text-base font-medium"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {locale === "mr"
            ? "ग्राहकांना ही किंमत किंवा 'त्यापुढील' दर म्हणून दिसेल."
            : locale === "hi"
              ? "ग्राहकों को यह मूल्य या 'से शुरू' दर के रूप में दिखेगा।"
              : "Buyers will see this as the base '{price} onwards' price on the marketplace."}
        </p>
      </div>

      <Button
        size="lg"
        className="h-12 w-full text-base font-semibold"
        onClick={handleContinue}
        disabled={!price}
      >
        {t("qnaNext")}
      </Button>
    </div>
  )
}
