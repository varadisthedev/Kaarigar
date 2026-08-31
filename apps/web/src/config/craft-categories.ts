/**
 * Shared reference list — used by the offline extraction fallback (keyword
 * matching against a transcript), the marketplace category filter, and the
 * seed data. Keeping it in one place means a new category shows up
 * everywhere consistently.
 */
export type CraftCategory = {
  id: string
  labelEn: string
  labelHi: string
  labelMr: string
  keywords: string[] // matched case-insensitively against a raw transcript
}

export const craftCategories: CraftCategory[] = [
  {
    id: "block-printing",
    labelEn: "Block Printing",
    labelHi: "ब्लॉक प्रिंटिंग",
    labelMr: "ब्लॉक प्रिंटिंग",
    keywords: ["block print", "block printing", "ajrakh", "bagru", "dabu", "sanganeri", "batik", "stamp", "dyeing", "अजरख", "छपाई", "ब्लॉक प्रिंट", "दाबू"],
  },
  {
    id: "handloom-weaving",
    labelEn: "Handloom Weaving",
    labelHi: "हथकरघा बुनाई",
    labelMr: "हातमाग विणकाम",
    keywords: [
      "handloom",
      "weav",
      "saree",
      "banarasi",
      "chanderi",
      "khadi",
      "silk",
      "cotton",
      "shawl",
      "dupatta",
      "linen",
      "carpet",
      "rug",
      "durrie",
      "fabric",
      "textile",
      "yarn",
      "loom",
      "बुनाई",
      "साड़ी",
      "करघा",
      "खादी",
      "शॉल",
      "हातमाग",
      "विणकाम",
      "कापड",
    ],
  },
  {
    id: "wooden-lacquerware",
    labelEn: "Wooden Lacquerware",
    labelHi: "लकड़ी का लाख का काम",
    labelMr: "लाकूड व लाख काम",
    keywords: [
      "lacquer",
      "wooden",
      "wood",
      "toy",
      "toys",
      "carving",
      "timber",
      "channapatna",
      "sandalwood",
      "teak",
      "sheesham",
      "लाख",
      "लकड़ी के खिलौने",
      "लकड़ी",
      "काष्ठ",
      "लाकडी खेळणी",
      "लाकूडकाम",
      "लाकूड",
    ],
  },
  {
    id: "folk-painting",
    labelEn: "Folk Painting",
    labelHi: "लोक चित्रकला",
    labelMr: "लोक चित्रकला",
    keywords: [
      "madhubani",
      "mithila",
      "warli",
      "pattachitra",
      "thangka",
      "gond",
      "kalamkari",
      "miniature",
      "painting",
      "paint",
      "canvas",
      "sketch",
      "mural",
      "चित्रकला",
      "पेंटिंग",
      "वारली",
      "मधुबनी",
      "गोंड",
      "पट्टाचित्र",
    ],
  },
  {
    id: "pottery",
    labelEn: "Pottery & Ceramics",
    labelHi: "मिट्टी के बर्तन",
    labelMr: "मातीची भांडी व सिरॅमिक्स",
    keywords: [
      "pottery",
      "clay",
      "ceramic",
      "terracotta",
      "pot",
      "pots",
      "vase",
      "matka",
      "earthen",
      "diya",
      "kulhad",
      "cups",
      "mugs",
      "mud",
      "मिट्टी",
      "मृदभांड",
      "मातीची भांडी",
      "टेराकोटा",
      "मटका",
      "कुल्हड़",
      "माती",
    ],
  },
  {
    id: "embroidery",
    labelEn: "Embroidery",
    labelHi: "कढ़ाई",
    labelMr: "भरतकाम",
    keywords: [
      "embroidery",
      "zardozi",
      "phulkari",
      "chikankari",
      "kantha",
      "mirror work",
      "needlework",
      "thread",
      "stitch",
      "sewing",
      "कढ़ाई",
      "जरदोजी",
      "चिकनकारी",
      "भरतकाम",
      "कशिदाकारी",
    ],
  },
  {
    id: "metalwork",
    labelEn: "Metalwork",
    labelHi: "धातु शिल्प",
    labelMr: "धातू शिल्प",
    keywords: [
      "metal",
      "brass",
      "bronze",
      "copper",
      "iron",
      "bell metal",
      "bidri",
      "dhokra",
      "silverware",
      "utensil",
      "sculpture",
      "धातु",
      "पीतल",
      "तांबा",
      "कांसा",
      "पितळ",
      "तांबे",
      "लोहार",
      "धातू शिल्प",
      "धातूकाम",
    ],
  },
  {
    id: "jewelry",
    labelEn: "Jewelry Making",
    labelHi: "आभूषण निर्माण",
    labelMr: "दागिने निर्मिती",
    keywords: [
      "jewel",
      "jewellery",
      "jewelry",
      "silver work",
      "gold",
      "bead",
      "beads",
      "necklace",
      "earring",
      "earrings",
      "bangle",
      "bangles",
      "anklet",
      "ring",
      "gemstone",
      "ornament",
      "आभूषण",
      "गहने",
      "कंगन",
      "झुमके",
      "दागिन्यांचे",
      "दागिने",
      "अलंकार",
      "बांगड्या",
    ],
  },
  {
    id: "leatherwork",
    labelEn: "Leatherwork",
    labelHi: "चमड़े का काम",
    labelMr: "चामड्याचे काम",
    keywords: [
      "leather",
      "mojari",
      "juti",
      "footwear",
      "bag",
      "bags",
      "wallet",
      "belt",
      "saddle",
      "hide",
      "चमड़ा",
      "जूती",
      "चामडे",
      "चर्मोद्योग",
      "पादत्राणे",
    ],
  },
  {
    id: "bamboo-craft",
    labelEn: "Bamboo & Cane Craft",
    labelHi: "बांस शिल्प",
    labelMr: "बांबू व वेत शिल्प",
    keywords: [
      "bamboo",
      "cane",
      "wicker",
      "rattan",
      "basket",
      "baskets",
      "reed",
      "straw",
      "jute",
      "बांस",
      "बेंत",
      "वेत",
      "टोपली",
      "बांबू शिल्प",
      "वेतकाम",
    ],
  },
  {
    id: "other",
    labelEn: "Other",
    labelHi: "अन्य",
    labelMr: "इतर",
    keywords: ["other", "others", "misc", "miscellaneous", "अन्य", "इतर", "विविध", "दुसरे"],
  },
]

export function getCategoryLabel(category: CraftCategory | string | undefined, locale: string): string {
  if (!category) return ""
  const cat = typeof category === "string" ? craftCategories.find((c) => c.labelEn.toLowerCase() === category.toLowerCase() || c.id === category.toLowerCase()) : category
  if (!cat) return typeof category === "string" ? category : ""
  if (locale === "mr") return cat.labelMr || cat.labelHi || cat.labelEn
  if (locale === "hi") return cat.labelHi || cat.labelEn
  return cat.labelEn
}

export function findCraftCategoryByKeyword(text: string): CraftCategory | undefined {
  if (!text) return undefined
  const lower = text.toLowerCase().trim()
  // Match standard craft categories first (exclude "other" from auto-keyword matches)
  return craftCategories.find((c) => c.id !== "other" && c.keywords.some((k) => lower.includes(k.toLowerCase())))
}

/**
 * Resolves a craft category dynamically:
 * 1. Checks if the transcript matches a known craft category.
 * 2. If not, cleans conversational framing and creates a new Title Case category name from the user's input.
 * 3. Never returns "Other".
 */
export function resolveCraftCategory(text: string): string | undefined {
  if (!text) return undefined
  const match = findCraftCategoryByKeyword(text)
  if (match) return match.labelEn

  // Clean conversational prefixes
  let cleaned = text
    .trim()
    .replace(/^(i\s+make|we\s+make|i\s+do|we\s+do|i\s+create|i\s+manufacture|my\s+craft\s+is|it\s+is|craft\s+is|art\s+is|making|creating)\s+/i, "")
    .replace(/^(main\s+banata\s+hoon|hum\s+banate\s+hain|humara\s+kam\s+hai|kaam\s+hai|kala\s+hai|banate\s+hain|banata\s+hu)\s+/i, "")
    .replace(/^(मी\s+बनवतो|आम्ही\s+बनवतो|माझी\s+कला\s+आहे|कला\s+आहे)\s+/i, "")
    .replace(/[.,!?]+$/, "")
    .trim()

  if (!cleaned || cleaned.toLowerCase() === "other") {
    // If still empty or literally "other", return original text or undefined
    return text.trim() && text.toLowerCase() !== "other" ? text.trim() : undefined
  }

  // Format as clean Title Case for display
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}
