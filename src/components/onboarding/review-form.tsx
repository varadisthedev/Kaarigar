"use client"

import * as React from "react"
import { Pencil } from "lucide-react"
import { useTranslations } from "next-intl"

import { craftCategories } from "@/config/craft-categories"
import { INDIAN_STATES } from "@/core/business/business-code"
import type { BusinessDraft } from "@/core/business/draft"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ReviewFormValues = {
  businessName: string
  craftCategory: string
  description: string
  district: string
  state: string
  yearsExperience: string
  monthlyCapacity: string
}

function ReviewRow({
  label,
  value,
  editing,
  onToggleEdit,
  children,
}: {
  label: string
  value: string
  editing: boolean
  onToggleEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {!editing && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <Pencil className="size-3" />
          </button>
        )}
      </div>
      {editing ? children : <p className="text-sm text-foreground">{value || "—"}</p>}
    </div>
  )
}

export function ReviewForm({
  values,
  onChange,
  locale,
}: {
  values: ReviewFormValues
  onChange: (values: ReviewFormValues) => void
  locale: "en" | "hi"
}) {
  const t = useTranslations("onboarding")
  const [editing, setEditing] = React.useState<Set<keyof ReviewFormValues>>(new Set())

  function toggle(field: keyof ReviewFormValues) {
    setEditing((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  function set<K extends keyof ReviewFormValues>(field: K, value: ReviewFormValues[K]) {
    onChange({ ...values, [field]: value })
  }

  return (
    <div className="flex flex-col">
      <ReviewRow
        label={t("fieldBusinessName")}
        value={values.businessName}
        editing={editing.has("businessName")}
        onToggleEdit={() => toggle("businessName")}
      >
        <Input value={values.businessName} onChange={(e) => set("businessName", e.target.value)} autoFocus />
      </ReviewRow>

      <ReviewRow
        label={t("fieldCraftCategory")}
        value={
          craftCategories.find((c) => c.labelEn === values.craftCategory)?.[locale === "hi" ? "labelHi" : "labelEn"] ??
          values.craftCategory
        }
        editing={editing.has("craftCategory")}
        onToggleEdit={() => toggle("craftCategory")}
      >
        <Select
          value={values.craftCategory}
          onValueChange={(v) => set("craftCategory", v as string)}
          items={craftCategories.map((c) => ({ value: c.labelEn, label: c.labelEn }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("fieldCraftCategory")} />
          </SelectTrigger>
          <SelectContent>
            {craftCategories.map((c) => (
              <SelectItem key={c.id} value={c.labelEn}>
                {locale === "hi" ? c.labelHi : c.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ReviewRow>

      <ReviewRow
        label={t("fieldDescription")}
        value={values.description}
        editing={editing.has("description")}
        onToggleEdit={() => toggle("description")}
      >
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className="w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          autoFocus
        />
      </ReviewRow>

      <ReviewRow
        label={t("fieldState")}
        value={values.state}
        editing={editing.has("state")}
        onToggleEdit={() => toggle("state")}
      >
        <Select
          value={values.state}
          onValueChange={(v) => set("state", v as string)}
          items={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("fieldState")} />
          </SelectTrigger>
          <SelectContent>
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ReviewRow>

      <ReviewRow
        label={t("fieldDistrict")}
        value={values.district}
        editing={editing.has("district")}
        onToggleEdit={() => toggle("district")}
      >
        <Input value={values.district} onChange={(e) => set("district", e.target.value)} autoFocus />
      </ReviewRow>

      <ReviewRow
        label={t("fieldExperience")}
        value={values.yearsExperience}
        editing={editing.has("yearsExperience")}
        onToggleEdit={() => toggle("yearsExperience")}
      >
        <Input
          type="number"
          inputMode="numeric"
          value={values.yearsExperience}
          onChange={(e) => set("yearsExperience", e.target.value)}
          autoFocus
        />
      </ReviewRow>

      <ReviewRow
        label={t("fieldCapacity")}
        value={values.monthlyCapacity}
        editing={editing.has("monthlyCapacity")}
        onToggleEdit={() => toggle("monthlyCapacity")}
      >
        <Input value={values.monthlyCapacity} onChange={(e) => set("monthlyCapacity", e.target.value)} autoFocus />
      </ReviewRow>
    </div>
  )
}

export function draftToFormValues(draft: Partial<BusinessDraft>, locale: "en" | "hi"): ReviewFormValues {
  return {
    businessName: draft.businessName ?? "",
    craftCategory: draft.craftCategory ?? "",
    description: (locale === "hi" ? draft.descriptionHi : draft.descriptionEn) ?? "",
    district: draft.district ?? "",
    state: draft.state ?? "",
    yearsExperience: draft.yearsExperience != null ? String(draft.yearsExperience) : "",
    monthlyCapacity: draft.monthlyCapacity ?? "",
  }
}
