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
  keywords: string[] // matched case-insensitively against a raw transcript
}

export const craftCategories: CraftCategory[] = [
  {
    id: "block-printing",
    labelEn: "Block Printing",
    labelHi: "ब्लॉक प्रिंटिंग",
    keywords: ["block print", "ajrakh", "bagru", "अजरख", "छपाई", "ब्लॉक प्रिंट"],
  },
  {
    id: "handloom-weaving",
    labelEn: "Handloom Weaving",
    labelHi: "हथकरघा बुनाई",
    keywords: ["handloom", "weav", "saree", "banarasi", "बुनाई", "साड़ी", "करघा"],
  },
  {
    id: "wooden-lacquerware",
    labelEn: "Wooden Lacquerware",
    labelHi: "लकड़ी का लाख का काम",
    keywords: ["lacquer", "wooden toy", "channapatna", "लाख", "लकड़ी के खिलौने"],
  },
  {
    id: "folk-painting",
    labelEn: "Folk Painting",
    labelHi: "लोक चित्रकला",
    keywords: ["madhubani", "mithila", "warli", "painting", "चित्रकला", "पेंटिंग"],
  },
  {
    id: "pottery",
    labelEn: "Pottery & Ceramics",
    labelHi: "मिट्टी के बर्तन",
    keywords: ["pottery", "clay", "ceramic", "terracotta", "मिट्टी", "मृदभांड"],
  },
  {
    id: "embroidery",
    labelEn: "Embroidery",
    labelHi: "कढ़ाई",
    keywords: ["embroidery", "zardozi", "phulkari", "chikankari", "कढ़ाई", "जरदोजी"],
  },
  {
    id: "metalwork",
    labelEn: "Metalwork",
    labelHi: "धातु शिल्प",
    keywords: ["metal", "brass", "bidri", "dhokra", "धातु", "पीतल"],
  },
  {
    id: "jewelry",
    labelEn: "Jewelry Making",
    labelHi: "आभूषण निर्माण",
    keywords: ["jewel", "jewellery", "silver work", "आभूषण", "गहने"],
  },
  {
    id: "leatherwork",
    labelEn: "Leatherwork",
    labelHi: "चमड़े का काम",
    keywords: ["leather", "mojari", "juti", "चमड़ा", "जूती"],
  },
  {
    id: "bamboo-craft",
    labelEn: "Bamboo & Cane Craft",
    labelHi: "बांस शिल्प",
    keywords: ["bamboo", "cane", "बांस", "बेंत"],
  },
]

export function findCraftCategoryByKeyword(text: string): CraftCategory | undefined {
  const lower = text.toLowerCase()
  return craftCategories.find((c) => c.keywords.some((k) => lower.includes(k.toLowerCase())))
}
