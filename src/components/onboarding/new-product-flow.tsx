"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { Sparkles } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "@/i18n/navigation"
import type { ProductDraft } from "@/core/business/draft"

import { MicButton } from "./mic-button"
import { PhotoUpload, type ReadyPhoto } from "@/components/media/photo-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

type Step = "voice" | "details" | "photos" | "done"

export function NewProductFlow({
  businessId,
  craftCategory,
  state,
  hasServerSpeech,
}: {
  businessId: string
  craftCategory: string
  state?: string
  hasServerSpeech: boolean
}) {
  const t = useTranslations("sell")
  const tCommon = useTranslations("common")
  const tProduct = useTranslations("product")
  const tOnboarding = useTranslations("onboarding")
  const locale = useLocale() as "en" | "hi"
  const router = useRouter()

  const [draftId] = React.useState(() => crypto.randomUUID())
  const [step, setStep] = React.useState<Step>("voice")
  const [titleEn, setTitleEn] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [materials, setMaterials] = React.useState("")
  const [dimensions, setDimensions] = React.useState("")
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [suggestionLoading, setSuggestionLoading] = React.useState(false)
  const [photos, setPhotos] = React.useState<ReadyPhoto[]>([])
  const [pending, setPending] = React.useState(false)

  function handleVoiceResult({ draft }: { transcript: string; draft: ProductDraft }) {
    setTitleEn(draft.titleEn ?? "")
    setDescription((locale === "hi" ? draft.descriptionHi : draft.descriptionEn) ?? "")
    setMaterials(draft.materials?.join(", ") ?? "")
    setDimensions(draft.dimensions ?? "")
    setStep("details")
    fetchSuggestion(draft)
  }

  async function fetchSuggestion(draft: ProductDraft) {
    setSuggestionLoading(true)
    try {
      const res = await apiFetch("/api/pricing/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: craftCategory,
          material: draft.materials?.[0],
          region: state,
          descriptionEn: draft.descriptionEn,
          locale,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPriceMin((prev) => prev || String(data.min))
        setPriceMax((prev) => prev || String(data.max))
      }
    } finally {
      setSuggestionLoading(false)
    }
  }

  async function submit() {
    setPending(true)
    try {
      const res = await apiFetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          titleEn: titleEn || "Untitled product",
          descriptionEn: description || undefined,
          materials: materials ? materials.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
          dimensions: dimensions || undefined,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          photos,
        }),
      })
      if (res.ok) {
        setStep("done")
        setTimeout(() => router.push("/"), 1500)
      }
    } finally {
      setPending(false)
    }
  }

  if (step === "voice") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("newProductTitle")}</CardTitle>
          <CardDescription>{t("newProductSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <MicButton<ProductDraft>
            draftId={draftId}
            locale={locale}
            purpose="product_catalog"
            hasServerSpeech={hasServerSpeech}
            onResult={handleVoiceResult}
          />
          <Button variant="link" size="sm" onClick={() => setStep("details")}>
            {tOnboarding("typeInstead")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "details") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tCommon("edit")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-desc">{tOnboarding("fieldDescription")}</Label>
            <textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-materials">{tProduct("materials")}</Label>
            <Input id="p-materials" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="cotton, natural dye" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-dimensions">{tProduct("dimensions")}</Label>
            <Input id="p-dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-min">{t("priceMin")}</Label>
              <Input id="p-min" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-max">{t("priceMax")}</Label>
              <Input id="p-max" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </div>
          </div>
          {suggestionLoading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3" /> {t("gettingSuggestion")}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => setStep("photos")} disabled={!titleEn}>
            {tCommon("proceed")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "photos") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tOnboarding("photosTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload kind="product_photo" onChange={setPhotos} />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={submit} disabled={pending || photos.length === 0}>
            {tCommon("submit")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">{t("productAdded")}</CardContent>
    </Card>
  )
}
