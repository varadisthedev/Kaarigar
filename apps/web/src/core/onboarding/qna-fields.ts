import type { BusinessDraft, ProductDraft } from "@/core/business/draft"
import type { QnaField } from "@/components/onboarding/voice-qna"

/** Field scripts for the conversational onboarding steps — one entry per
 * spoken question, in the order they're asked. `description`/`title` read
 * and write whichever of the En/Hi pair matches the active locale, since the
 * extractor fills both from a single utterance but the UI only shows one. */
export function businessQnaFields(locale: "en" | "hi" | "mr"): QnaField<BusinessDraft>[] {
  return [
    {
      id: "businessName",
      promptKey: "promptBusinessName",
      label: "fieldBusinessName",
      required: true,
      getValue: (d) => d.businessName,
      setValue: (d, v) => ({ ...d, businessName: v }),
    },
    {
      id: "craftCategory",
      promptKey: "promptCraftCategory",
      label: "fieldCraftCategory",
      required: true,
      getValue: (d) => d.craftCategory,
      setValue: (d, v) => ({ ...d, craftCategory: v }),
    },
    {
      id: "description",
      promptKey: "promptDescription",
      label: "fieldDescription",
      required: true,
      getValue: (d) => (locale === "hi" ? d.descriptionHi : d.descriptionEn),
      setValue: (d, v) => (locale === "hi" ? { ...d, descriptionHi: v } : { ...d, descriptionEn: v }),
    },
    {
      id: "yearsExperience",
      promptKey: "promptYearsExperience",
      label: "fieldExperience",
      required: false,
      getValue: (d) => (d.yearsExperience != null ? String(d.yearsExperience) : undefined),
      setValue: (d, v) => ({ ...d, yearsExperience: v ? Number(v) || undefined : undefined }),
    },
    {
      id: "monthlyCapacity",
      promptKey: "promptMonthlyCapacity",
      label: "fieldCapacity",
      required: false,
      getValue: (d) => d.monthlyCapacity,
      setValue: (d, v) => ({ ...d, monthlyCapacity: v }),
    },
  ]
}

export function productQnaFields(locale: "en" | "hi" | "mr"): QnaField<ProductDraft>[] {
  return [
    {
      id: "title",
      promptKey: "promptProductTitle",
      label: "fieldProductTitle",
      required: true,
      getValue: (d) => (locale === "hi" ? d.titleHi : d.titleEn),
      setValue: (d, v) => (locale === "hi" ? { ...d, titleHi: v } : { ...d, titleEn: v }),
    },
    {
      id: "description",
      promptKey: "promptProductDescription",
      label: "fieldProductDescription",
      required: true,
      getValue: (d) => (locale === "hi" ? d.descriptionHi : d.descriptionEn),
      setValue: (d, v) => (locale === "hi" ? { ...d, descriptionHi: v } : { ...d, descriptionEn: v }),
    },
  ]
}
