"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import type { ProductDraft } from "@/core/business/draft"
import { productQnaFields } from "@/core/onboarding/qna-fields"

import { VoiceQna } from "./voice-qna"
import { ProductPriceStep } from "./product-price-step"
import { TalkingPrompt } from "./talking-prompt"
import { PhotoUpload, type ReadyPhoto } from "@/components/media/photo-upload"
import type { UploadKind } from "@/lib/cloudinary-upload"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

type Step = "qna" | "price" | "photos"

export type CapturedProduct = {
  draft: Partial<ProductDraft>
  price: { priceMin?: number; priceMax?: number }
  photos: ReadyPhoto[]
}

/** The one conversational, voice-first flow for describing a product —
 * chat-style Q&A, then price, then photos. Deliberately asks nothing about
 * the artisan themselves (name, phone, etc.) — that lives elsewhere. Shared
 * verbatim between full business onboarding and the returning-seller "add
 * product" flow, so both funnel through the same NLP-driven UI instead of
 * diverging into a voice-once-then-manual-form path. */
export function ProductCaptureFlow({
  draftId,
  locale,
  craftCategory,
  region,
  initialDraft,
  photoKind = "onboarding_photo",
  acceptVideo = false,
  onComplete,
}: {
  draftId: string
  locale: "en" | "hi"
  /** Optional context used only to fetch a price suggestion — never shown or collected from the artisan here. */
  craftCategory?: string
  region?: string
  initialDraft?: Partial<ProductDraft>
  photoKind?: UploadKind
  acceptVideo?: boolean
  onComplete: (result: CapturedProduct) => void
}) {
  const t = useTranslations("onboarding")
  const [step, setStep] = React.useState<Step>("qna")
  const [draft, setDraft] = React.useState<Partial<ProductDraft>>(initialDraft ?? {})
  const [price, setPrice] = React.useState<{ priceMin?: number; priceMax?: number }>({})
  const [photos, setPhotos] = React.useState<ReadyPhoto[]>([])

  if (step === "qna") {
    return (
      <Card>
        <CardContent className="pt-5">
          <VoiceQna
            draftId={draftId}
            locale={locale}
            purpose="product_catalog"
            fields={productQnaFields(locale)}
            initialDraft={draft}
            onComplete={(d) => {
              setDraft(d)
              setStep("price")
            }}
          />
        </CardContent>
      </Card>
    )
  }

  if (step === "price") {
    return (
      <Card>
        <CardContent className="pt-5">
          <ProductPriceStep
            locale={locale}
            craftCategory={craftCategory}
            region={region}
            material={draft.materials?.[0]}
            descriptionEn={draft.descriptionEn}
            onContinue={(result) => {
              setPrice(result)
              setStep("photos")
            }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("productPhotosTitle")}</CardTitle>
        <CardDescription>{t("productPhotosSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <TalkingPrompt
          promptKey="promptProductPhotosIntro"
          locale={locale}
          text={t("promptProductPhotosIntro")}
          className="mb-4 flex items-start gap-2"
        />
        <PhotoUpload kind={photoKind} draftId={draftId} acceptVideo={acceptVideo} onChange={setPhotos} />
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onComplete({ draft, price, photos })}
          disabled={photos.length === 0}
        >
          {t("qnaNext")}
        </Button>
      </CardFooter>
    </Card>
  )
}
