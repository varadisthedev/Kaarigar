"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "@/i18n/navigation"

import { ProductCaptureFlow, type CapturedProduct } from "./product-capture-flow"
import { Card, CardContent } from "@/components/ui/card"

/** The returning-seller "+ add product" flow — same conversational,
 * voice-first product capture used during business onboarding, just
 * submitted straight to `/api/products` instead of bundled into the
 * onboarding review. Asks nothing about the artisan themselves. */
export function NewProductFlow({
  businessId,
  craftCategory,
  state,
}: {
  businessId: string
  craftCategory: string
  state?: string
}) {
  const t = useTranslations("sell")
  const locale = useLocale() as "en" | "hi"
  const router = useRouter()

  const [draftId] = React.useState(() => crypto.randomUUID())
  const [done, setDone] = React.useState(false)

  async function submit({ draft, price, photos }: CapturedProduct) {
    const res = await apiFetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessId,
        titleEn: draft.titleEn || draft.titleHi || "Untitled product",
        titleHi: draft.titleHi,
        descriptionEn: draft.descriptionEn,
        descriptionHi: draft.descriptionHi,
        materials: draft.materials,
        priceMin: price.priceMin,
        priceMax: price.priceMax,
        photos,
      }),
    })
    if (res.ok) {
      setDone(true)
      setTimeout(() => router.push("/"), 1500)
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">{t("productAdded")}</CardContent>
      </Card>
    )
  }

  return (
    <ProductCaptureFlow
      draftId={draftId}
      locale={locale}
      craftCategory={craftCategory}
      region={state}
      photoKind="product_photo"
      acceptVideo
      onComplete={submit}
    />
  )
}
