/** What the voice pipeline fills in, and what the artisan reviews/edits
 * before proceeding. Every field is optional — extraction is best-effort,
 * never a hard requirement, since the fallback path (no Gemini key) fills in
 * far less than the full pipeline does. */
export type BusinessDraft = {
  businessName?: string
  craftCategory?: string
  descriptionEn?: string
  descriptionHi?: string
  district?: string
  state?: string
  yearsExperience?: number
  monthlyCapacity?: string
  /** 0-1, how much of this the extractor is confident about — surfaced in
   * the review UI so an artisan knows what's worth double-checking. */
  confidence: number
}

export type ProductDraft = {
  titleEn?: string
  titleHi?: string
  descriptionEn?: string
  descriptionHi?: string
  materials?: string[]
  dimensions?: string
  seoKeywords?: string[]
  confidence: number
}
