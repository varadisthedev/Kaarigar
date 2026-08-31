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
  media: Media[]
}

export type ProductDetail = ProductSummary & {
  descriptionEn?: string | null
  businessId: string
}

export type Inquiry = {
  id: string
  businessId: string
  productId?: string | null
  message: string
  status: string
  createdAt: string
}

export type ChatMessage = {
  id: string
  inquiryId: string
  senderId: string
  body: string
  createdAt: string
}
