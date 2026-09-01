export type Media = { url: string; altEn?: string | null; isPrimary?: boolean | null }

export type BusinessSummary = {
  id: string
  businessCode: string | null
  displayName: string
  craftCategory: string
  state: string | null
  media: Media[]
  products: ProductSummary[]
}

export type ProductSummary = {
  id: string
  slug: string
  titleEn: string
  titleHi?: string | null
  priceMin?: string | null
  priceMax?: string | null
  status?: string
  media: Media[]
}

export type ProductDetail = ProductSummary & {
  descriptionEn?: string | null
  businessId: string
  craftCategory?: string
  viewCount?: number
  business?: {
    displayName: string
    craftCategory: string
    state: string | null
  }
}

export type Inquiry = {
  id: string
  businessId: string
  productId?: string | null
  buyerId?: string
  message: string
  status: string
  quantity?: string | null
  targetPrice?: string | null
  createdAt: string
  businessName?: string
  productTitle?: string
  productImage?: string
  lastMessage?: string
}

export type ChatMessage = {
  id: string
  inquiryId: string
  senderId: string
  body: string
  createdAt: string
}

export type PriceSuggestionResult = {
  price: number
  marketMin: number
  marketMax: number
  materialCost?: number
  confidence: number
  engine: "ml_service" | "rules_engine" | "gemini"
  rationaleEn: string
  rationaleHi: string
}

export type Order = {
  id: string
  businessId: string
  productId?: string | null
  quantity: number
  totalAmount: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  notes?: string
  createdAt: string
}
