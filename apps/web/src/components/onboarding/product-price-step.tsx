"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { TalkingPrompt } from "./talking-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ProductPriceStep({
  locale,
  onContinue,
}: {
  locale: "en" | "hi"
  onContinue: (result: { priceMin?: number; priceMax?: number }) => void
}) {
  const t = useTranslations("onboarding")
  const tSell = useTranslations("sell")
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")

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
