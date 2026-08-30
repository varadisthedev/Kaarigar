"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Check } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export function EditProductForm({
  productId,
  initial,
}: {
  productId: string
  initial: {
    titleEn: string
    descriptionEn: string
    materials: string[]
    dimensions: string
    priceMin: string
    priceMax: string
    tags: string[]
  }
}) {
  const t = useTranslations("sell")
  const tProduct = useTranslations("product")
  const tOnboarding = useTranslations("onboarding")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const [titleEn, setTitleEn] = React.useState(initial.titleEn)
  const [description, setDescription] = React.useState(initial.descriptionEn)
  const [materials, setMaterials] = React.useState(initial.materials.join(", "))
  const [dimensions, setDimensions] = React.useState(initial.dimensions)
  const [priceMin, setPriceMin] = React.useState(initial.priceMin)
  const [priceMax, setPriceMax] = React.useState(initial.priceMax)
  const [tags, setTags] = React.useState(initial.tags.join(", "))
  const [pending, setPending] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setSaved(false)
    try {
      const res = await apiFetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titleEn,
          descriptionEn: description || undefined,
          materials: materials ? materials.split(",").map((m) => m.trim()).filter(Boolean) : [],
          dimensions: dimensions || undefined,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          seoKeywords: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        }),
      })
      if (res.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(() => router.push("/sell/products"), 900)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-title">{tProduct("title")}</Label>
            <Input id="e-title" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-desc">{tOnboarding("fieldDescription")}</Label>
            <textarea
              id="e-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-materials">{tProduct("materials")}</Label>
            <Input id="e-materials" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="cotton, natural dye" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-dimensions">{tProduct("dimensions")}</Label>
            <Input id="e-dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-min">{t("priceMin")}</Label>
              <Input id="e-min" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-max">{t("priceMax")}</Label>
              <Input id="e-max" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="e-tags">{tProduct("tags")}</Label>
            <Input id="e-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Home Decor, Handcrafted" />
            <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full gap-1.5" disabled={pending || !titleEn}>
            {saved ? (
              <>
                <Check className="size-4" />
                {t("changesSaved")}
              </>
            ) : pending ? (
              tCommon("loading")
            ) : (
              t("saveChanges")
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
