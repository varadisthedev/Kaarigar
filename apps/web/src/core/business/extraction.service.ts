import "server-only"

import { features } from "@/config/env"
import { generateStructured, GeminiType } from "@/infra/ai/gemini.client"
import { craftCategories, findCraftCategoryByKeyword, resolveCraftCategory } from "@/config/craft-categories"
import { INDIAN_STATES } from "./business-code"
import type { BusinessDraft, ProductDraft } from "./draft"

const BUSINESS_DRAFT_SCHEMA = {
  type: GeminiType.OBJECT,
  properties: {
    businessName: { type: GeminiType.STRING, nullable: true },
    craftCategory: {
      type: GeminiType.STRING,
      nullable: true,
    },
    descriptionEn: { type: GeminiType.STRING, nullable: true },
    descriptionHi: { type: GeminiType.STRING, nullable: true },
    district: { type: GeminiType.STRING, nullable: true },
    state: { type: GeminiType.STRING, enum: INDIAN_STATES, nullable: true },
    yearsExperience: { type: GeminiType.NUMBER, nullable: true },
    monthlyCapacity: { type: GeminiType.STRING, nullable: true },
  },
  required: [],
}

const SYSTEM_INSTRUCTION = `You turn a spoken, informal description from an Indian artisan (often mixed Hindi/English, sometimes a regional language transcribed as best-effort) into a clean, professional business listing.
- Write descriptionEn and descriptionHi as 2-3 warm, professional sentences suitable for a B2B marketplace listing, in English and Hindi respectively — translate/adapt as needed, don't just transliterate.
- craftCategory: Identify the craft category. First check if it relates to a standard Indian craft (e.g. Block Printing, Handloom Weaving, Wooden Lacquerware, Folk Painting, Pottery & Ceramics, Embroidery, Metalwork, Jewelry Making, Leatherwork, Bamboo & Cane Craft). If it represents a distinct or modern handcrafted craft, produce a clean Title-Cased category name for it (e.g. "Candle Making", "Resin Art", "Macrame Art", "Jute Craft", "Glass Art", "Paper Mache"). NEVER output "Other" or "Others".
- state must be an Indian state from the given enum, or null.
- Only fill a field if the transcript actually supports it. Leave anything unclear as null — never invent details.`

function offlineExtract(transcript: string): BusinessDraft {
  const category = resolveCraftCategory(transcript)
  const state = INDIAN_STATES.find((s) => transcript.toLowerCase().includes(s.toLowerCase()))
  const yearsMatch = transcript.match(/(\d{1,2})\s*(?:years?|साल|वर्ष)/i)
  const capacityMatch = transcript.match(/(\d{2,5})\s*(pieces|sarees|meters|kg|units|साड़ी|मीटर|पीस)/i)

  return {
    craftCategory: category,
    descriptionEn: transcript,
    descriptionHi: transcript,
    state,
    yearsExperience: yearsMatch ? Number(yearsMatch[1]) : undefined,
    monthlyCapacity: capacityMatch ? `${capacityMatch[1]} ${capacityMatch[2]}` : undefined,
    confidence: 0.35,
  }
}

export async function extractBusinessDraft(transcript: string): Promise<BusinessDraft> {
  if (!features.gemini) return offlineExtract(transcript)

  try {
    const result = await generateStructured<Omit<BusinessDraft, "confidence">>({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt: transcript,
      schema: BUSINESS_DRAFT_SCHEMA,
    })
    const category =
      result.craftCategory && result.craftCategory.toLowerCase() !== "other"
        ? result.craftCategory
        : resolveCraftCategory(transcript)

    return { ...result, craftCategory: category, confidence: 0.75 }
  } catch (err) {
    console.error("[extraction] Gemini call failed, using offline fallback:", err)
    return offlineExtract(transcript)
  }
}

const PRODUCT_DRAFT_SCHEMA = {
  type: GeminiType.OBJECT,
  properties: {
    titleEn: { type: GeminiType.STRING, nullable: true },
    titleHi: { type: GeminiType.STRING, nullable: true },
    descriptionEn: { type: GeminiType.STRING, nullable: true },
    descriptionHi: { type: GeminiType.STRING, nullable: true },
    materials: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING }, nullable: true },
    dimensions: { type: GeminiType.STRING, nullable: true },
    seoKeywords: { type: GeminiType.ARRAY, items: { type: GeminiType.STRING }, nullable: true },
  },
  required: [],
}

const PRODUCT_SYSTEM_INSTRUCTION = `You turn a spoken, informal description of a single handcrafted product into a professional, SEO-friendly B2B catalog listing.
- titleEn/titleHi: a concise, specific product item name based strictly on the user's spoken words (e.g., "Handmade Terracotta Chai Cups", "Embroidered Silk Cushion", "Brass Oil Lamp").
- CRITICAL: NEVER output a generic craft category name (such as "Pottery & Ceramics", "Handloom Weaving", "Block Printing", "Woodwork", "Jewelry Making", etc.) as the product title unless the user literally named their product that. The title must describe the specific product item.
- descriptionEn/descriptionHi: 2-3 professional sentences in English and Hindi respectively, highlighting material, craft technique, and use case.
- seoKeywords: 4-6 lowercase search terms a B2B buyer might use to find this product.
- Only fill a field the transcript actually supports; leave unclear fields null.`

function offlineExtractProduct(transcript: string): ProductDraft {
  const materialsGuess = transcript
    .match(/\b(cotton|silk|wood|clay|brass|silver|leather|bamboo|wool|jute)\b/gi)
    ?.map((m) => m.toLowerCase())

  // Clean conversational prefixes from the transcript to get a clean title
  const cleanedTitle = transcript
    .trim()
    .replace(/^(it\s+is\s+called|it's\s+called|its\s+called|this\s+is\s+a|this\s+is\s+an|it\s+is\s+a|i\s+make\s+a|i\s+call\s+it)\s+/i, "")
    .replace(/^(yeh\s+hai|iska\s+naam\s+hai|ise\s+kehte\s+hain|ye\s+ek)\s+/i, "")
    .replace(/^(हे\s+आहे|याचे\s+नाव\s+आहे)\s+/i, "")
    .trim()

  return {
    titleEn: cleanedTitle || transcript.trim(),
    titleHi: cleanedTitle || transcript.trim(),
    descriptionEn: transcript.trim(),
    descriptionHi: transcript.trim(),
    materials: materialsGuess ? Array.from(new Set(materialsGuess)) : undefined,
    confidence: 0.3,
  }
}

export async function extractProductDraft(transcript: string): Promise<ProductDraft> {
  if (!features.gemini) return offlineExtractProduct(transcript)

  try {
    const result = await generateStructured<Omit<ProductDraft, "confidence">>({
      systemInstruction: PRODUCT_SYSTEM_INSTRUCTION,
      prompt: transcript,
      schema: PRODUCT_DRAFT_SCHEMA,
    })
    return { ...result, confidence: 0.75 }
  } catch (err) {
    console.error("[extraction] Gemini product call failed, using offline fallback:", err)
    return offlineExtractProduct(transcript)
  }
}
