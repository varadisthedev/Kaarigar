"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { craftCategories, getCategoryLabel } from "@/config/craft-categories"
import { formatInr } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

type Result = { min: number; max: number; confidence: number; rationaleEn: string; rationaleHi: string }

export function PriceCheckForm() {
  const t = useTranslations("product")
  const locale = useLocale() as "en" | "hi" | "mr"
  const [category, setCategory] = React.useState("")
  const [material, setMaterial] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [sizeBand, setSizeBand] = React.useState<"small" | "medium" | "large">("medium")
  const [pending, setPending] = React.useState(false)
  const [result, setResult] = React.useState<Result | null>(null)

  async function check() {
    if (!category) return
    setPending(true)
    setResult(null)
    try {
      const res = await apiFetch("/api/pricing/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, material: material || undefined, sizeBand, descriptionEn: description || undefined, locale }),
      })
      if (res.ok) setResult(await res.json())
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Craft category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as string)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {craftCategories.map((c) => (
              <SelectItem key={c.id} value={c.labelEn}>
                {getCategoryLabel(c, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pc-material">{t("materials")}</Label>
        <Input id="pc-material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="cotton, brass, clay…" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Size</Label>
        <Select value={sizeBand} onValueChange={(v) => setSizeBand(v as typeof sizeBand)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pc-desc">Description (optional)</Label>
        <textarea
          id="pc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="A few details help refine the suggestion"
          className="w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
      </div>

      <Button onClick={check} disabled={!category || pending}>
        {pending ? "Checking…" : "Check price"}
      </Button>

      {result && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" /> {t("suggestedPrice")}
            </p>
            <p className="font-heading text-2xl font-medium text-foreground">
              {formatInr(result.min)} – {formatInr(result.max)}
            </p>
            <p className="text-sm text-muted-foreground">
              {locale === "hi" ? result.rationaleHi : result.rationaleEn}
            </p>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">{t("suggestedPriceHint")}</p>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
