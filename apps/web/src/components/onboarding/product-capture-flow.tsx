"use client"

import * as React from "react"
import { Sparkles, IndianRupee, Camera, Check } from "lucide-react"
import { useTranslations } from "next-intl"

import type { ProductDraft } from "@/core/business/draft"
import { productQnaFields } from "@/core/onboarding/qna-fields"
import { cn } from "@/lib/utils"

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

const TIMELINE_STEPS = [
  {
    id: "qna",
    labelEn: "1. Details",
    labelHi: "1. विवरण",
    labelMr: "1. माहिती",
    icon: Sparkles,
  },
  {
    id: "price",
    labelEn: "2. Pricing",
    labelHi: "2. मूल्य",
    labelMr: "2. किंमत",
    icon: IndianRupee,
  },
  {
    id: "photos",
    labelEn: "3. Photos",
    labelHi: "3. तस्वीरें",
    labelMr: "3. फोटो",
    icon: Camera,
  },
] as const

function ProductTimeline({ currentStep, locale }: { currentStep: Step; locale: "en" | "hi" | "mr" }) {
  const stepIdx = TIMELINE_STEPS.findIndex((s) => s.id === currentStep)

  return (
    <div className="mb-6 px-2">
      <div className="relative flex items-center justify-between">
        {/* Connecting progress track */}
        <div className="absolute top-4 left-6 right-6 -z-0 h-0.5 -translate-y-1/2 bg-border">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(stepIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {TIMELINE_STEPS.map((s, idx) => {
          const isDone = idx < stepIdx
          const isCurrent = idx === stepIdx
          const Icon = s.icon
          const label = locale === "mr" ? s.labelMr : locale === "hi" ? s.labelHi : s.labelEn

          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-all duration-300 sm:size-9",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : isCurrent
                      ? "border-primary bg-background text-primary ring-4 ring-primary/15 shadow-sm"
                      : "border-border bg-card text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-4 stroke-[2.5]" /> : <Icon className="size-3.5 sm:size-4" />}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap transition-colors sm:text-xs",
                  isCurrent ? "font-semibold text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The one conversational, voice-first flow for describing a product —
 * minimal chat-style Q&A (title + description), then price suggestion, then photos.
 * Never asks for personal/phone info here. */
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
  locale: "en" | "hi" | "mr"
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

  return (
    <div className="flex flex-col">
      <ProductTimeline currentStep={step} locale={locale} />

      {step === "qna" && (
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-6 sm:p-8">
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
      )}

      {step === "price" && (
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-6 sm:p-8">
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
      )}

      {step === "photos" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="px-6 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-xl sm:text-2xl">{t("productPhotosTitle")}</CardTitle>
            <CardDescription className="text-sm sm:text-base">{t("productPhotosSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
            <TalkingPrompt
              promptKey="promptProductPhotosIntro"
              locale={locale}
              text={t("promptProductPhotosIntro")}
              className="mb-4 flex items-start gap-2 text-base sm:text-lg"
            />
            <PhotoUpload kind={photoKind} draftId={draftId} acceptVideo={acceptVideo} onChange={setPhotos} />
          </CardContent>
          <CardFooter className="p-6 sm:p-8 pt-4 sm:pt-4">
            <Button
              className="h-12 w-full text-base font-semibold"
              onClick={() => onComplete({ draft, price, photos })}
              disabled={photos.length === 0}
            >
              {t("qnaNext")}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
