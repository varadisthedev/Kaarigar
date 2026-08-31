import "server-only"

import { getSpeechProviderChain } from "@/infra/speech"
import { createVoiceSession, attachVoiceSessionsToBusiness } from "@/infra/db/repositories/voice.repository"
import { createBusiness, addBusinessMedia } from "@/infra/db/repositories/business.repository"
import { createProductListing } from "./catalog.service"
import { extractBusinessDraft, extractProductDraft } from "./extraction.service"
import { generateBusinessCode } from "./business-code"
import type { BusinessDraft, ProductDraft } from "./draft"

type OnboardingPurpose = "business_onboarding" | "product_catalog"

function extractDraft(purpose: OnboardingPurpose, transcript: string): Promise<BusinessDraft | ProductDraft> {
  return purpose === "product_catalog" ? extractProductDraft(transcript) : extractBusinessDraft(transcript)
}

export type TranscribeResult =
  | { ok: true; transcript: string; language: string; draft: BusinessDraft | ProductDraft; provider: string }
  | { ok: false; useClientFallback: true }

/**
 * Tries each configured server-side provider in order (Sarvam -> Python ML
 * service). If none are configured, or every one throws, the caller (the API
 * route) tells the client to fall back to the browser's Web Speech API
 * instead — that path never reaches this function at all, it posts the
 * already-transcribed text straight to `saveClientTranscript` below.
 */
export async function transcribeAudio(input: {
  draftId: string
  purpose: OnboardingPurpose
  audio: Buffer
  mimeType: string
  languageHint?: string
}): Promise<TranscribeResult> {
  const chain = getSpeechProviderChain()

  for (const provider of chain) {
    try {
      const { transcript, language } = await provider.transcribe({
        audio: input.audio,
        mimeType: input.mimeType,
        languageHint: input.languageHint,
      })
      const draft = await extractDraft(input.purpose, transcript)

      await createVoiceSession({
        draftId: input.draftId,
        purpose: input.purpose,
        language,
        transcriptRaw: transcript,
        provider: provider.name,
        extractedJson: draft,
      })

      return { ok: true, transcript, language, draft, provider: provider.name }
    } catch (err) {
      console.error(`[onboarding] speech provider "${provider.name}" failed, trying next:`, err)
    }
  }

  return { ok: false, useClientFallback: true }
}

/** Web Speech API ran client-side and already produced text — this just
 * runs extraction and logs the audit row, same as the server-STT path does. */
export async function saveClientTranscript(input: {
  draftId: string
  purpose: OnboardingPurpose
  transcript: string
  language: string
}): Promise<{ draft: BusinessDraft | ProductDraft }> {
  const draft = await extractDraft(input.purpose, input.transcript)

  await createVoiceSession({
    draftId: input.draftId,
    purpose: input.purpose,
    language: input.language,
    transcriptRaw: input.transcript,
    provider: "web_speech",
    extractedJson: draft,
  })

  return { draft }
}

export type SubmitBusinessInput = {
  draftId: string
  ownerId: string
  displayName: string
  craftCategory: string
  descriptionEn?: string
  descriptionHi?: string
  district?: string
  state?: string
  pincode?: string
  yearsExperience?: number
  monthlyCapacity?: string
  latitude?: number
  longitude?: number
  photos: { url: string; publicId: string; enhancedUrl?: string }[]
  video?: { url: string; publicId: string }
  product?: {
    titleEn: string
    titleHi?: string
    descriptionEn?: string
    descriptionHi?: string
    materials?: string[]
    priceMin?: number
    priceMax?: number
    photos: { url: string; publicId: string; enhancedUrl?: string }[]
  }
}

/** The artisan has reviewed the draft, uploaded photos, and just verified
 * their phone — this is the actual submission, landing in `pending_review`
 * for the admin queue. When a first product was also captured during
 * onboarding, it's created right alongside as a `draft`-status product —
 * `approveBusiness` already bulk-publishes any draft products on approval,
 * so it rides along on the same human-review gate for free. */
export async function submitBusiness(input: SubmitBusinessInput) {
  const business = await createBusiness({
    ownerId: input.ownerId,
    displayName: input.displayName,
    craftCategory: input.craftCategory,
    descriptionEn: input.descriptionEn,
    descriptionHi: input.descriptionHi,
    district: input.district,
    state: input.state,
    pincode: input.pincode,
    yearsExperience: input.yearsExperience,
    monthlyCapacity: input.monthlyCapacity,
    latitude: input.latitude,
    longitude: input.longitude,
    status: "pending_review",
    submittedAt: new Date(),
    logoUrl: input.photos[0]?.url,
    logoPublicId: input.photos[0]?.publicId,
  })

  await Promise.all([
    ...input.photos.map((photo, i) =>
      addBusinessMedia({
        businessId: business.id,
        cloudinaryPublicId: photo.publicId,
        url: photo.url,
        enhancedUrl: photo.enhancedUrl,
        mediaType: "photo",
        isPrimary: i === 0,
      })
    ),
    ...(input.video
      ? [
          addBusinessMedia({
            businessId: business.id,
            cloudinaryPublicId: input.video.publicId,
            url: input.video.url,
            mediaType: "video",
            isPrimary: false,
          }),
        ]
      : []),
  ])

  if (input.product) {
    await createProductListing({
      businessId: business.id,
      ownerId: input.ownerId,
      titleEn: input.product.titleEn,
      titleHi: input.product.titleHi,
      descriptionEn: input.product.descriptionEn,
      descriptionHi: input.product.descriptionHi,
      materials: input.product.materials,
      priceMin: input.product.priceMin,
      priceMax: input.product.priceMax,
      photos: input.product.photos,
    })
  }

  await attachVoiceSessionsToBusiness(input.draftId, input.ownerId, business.id)

  return business
}

// Re-exported so the admin approval flow (Phase 9) uses the same generator.
export { generateBusinessCode }
