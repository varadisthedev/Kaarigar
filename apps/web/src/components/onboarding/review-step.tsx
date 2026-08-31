"use client"

import Image from "next/image"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { craftCategories, getCategoryLabel } from "@/config/craft-categories"
import type { BusinessDraft, ProductDraft } from "@/core/business/draft"
import type { ReadyPhoto } from "@/components/media/photo-upload"
import type { ReadyVideo } from "@/components/media/video-capture"
import type { LocationResult } from "./location-step"
import { formatPriceOnwards } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"



function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading text-sm font-semibold text-foreground">{children}</h3>
}

function PhotoGrid({ photos }: { photos: ReadyPhoto[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {photos.map((p) => (
        <div key={p.publicId} className="relative aspect-square overflow-hidden rounded-md border border-border bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.enhancedUrl ?? p.url} alt="" className="size-full object-cover" />
        </div>
      ))}
    </div>
  )
}

export function ReviewStep({
  locale,
  businessDraft,
  location,
  businessPhotos,
  video,
  productDraft,
  productPrice,
  productPhotos,
  submitting,
  error,
  onSubmit,
}: {
  locale: "en" | "hi" | "mr"
  businessDraft: Partial<BusinessDraft>
  location: LocationResult
  businessPhotos: ReadyPhoto[]
  video: ReadyVideo | null
  productDraft: Partial<ProductDraft>
  productPrice: { priceMin?: number; priceMax?: number }
  productPhotos: ReadyPhoto[]
  submitting: boolean
  error: string | null
  onSubmit: () => void
}) {
  const t = useTranslations("onboarding")
  const hasProduct = productPhotos.length > 0

  const categoryLabel = getCategoryLabel(businessDraft.craftCategory, locale) || businessDraft.craftCategory

  const description = locale === "hi" ? businessDraft.descriptionHi : businessDraft.descriptionEn
  const productTitle = locale === "hi" ? productDraft.titleHi : productDraft.titleEn
  const productDescription = locale === "hi" ? productDraft.descriptionHi : productDraft.descriptionEn

  return (
    <div className="flex flex-col gap-1">
      <div className="relative mb-3 overflow-hidden rounded-lg">
        <Image
          src="/dialog3.png"
          alt=""
          width={2172}
          height={724}
          className="h-24 w-full object-cover sm:h-32"
        />
      </div>

      <div className="flex items-center gap-2.5">
        <Image src="/brand-icon.png" alt="" width={176} height={160} className="size-9 object-contain" />
        <h2 className="font-heading text-lg font-medium text-foreground">{t("qnaSummaryTitle")}</h2>
      </div>



      <SectionTitle>{t("reviewBusinessTitle")}</SectionTitle>
      <div className="mt-2 flex flex-col gap-1.5 text-sm">
        <Row label={t("fieldBusinessName")} value={businessDraft.businessName} />
        <Row label={t("fieldCraftCategory")} value={categoryLabel} />
        <Row label={t("fieldDescription")} value={description} />
        <Row label={t("fieldExperience")} value={businessDraft.yearsExperience != null ? String(businessDraft.yearsExperience) : undefined} />
        <Row label={t("fieldCapacity")} value={businessDraft.monthlyCapacity} />
        <Row label={t("fieldState")} value={location.state} />
        <Row label={t("fieldDistrict")} value={location.district} />
      </div>

      {businessPhotos.length > 0 && (
        <>

          <SectionTitle>{t("reviewPhotosTitle")}</SectionTitle>
          <div className="mt-2">
            <PhotoGrid photos={businessPhotos} />
          </div>
        </>
      )}

      {video && (
        <>

          <SectionTitle>{t("reviewVideoTitle")}</SectionTitle>
          <div className="mt-2">
            <video src={video.url} controls className="aspect-video w-full max-w-xs rounded-lg border border-border" />
          </div>
        </>
      )}

      {hasProduct && (
        <>

          <SectionTitle>{t("reviewProductTitle")}</SectionTitle>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            <Row label={t("fieldProductTitle")} value={productTitle} />
            <Row label={t("fieldProductDescription")} value={productDescription} />
            <Row label={t("fieldProductMaterials")} value={productDraft.materials?.join(", ")} />
            <Row
              label={t("fieldProductPrice")}
              value={
                productPrice.priceMin || productPrice.priceMax
                  ? formatPriceOnwards(productPrice.priceMin ?? productPrice.priceMax, locale)
                  : undefined
              }
            />
          </div>
          <div className="mt-2">
            <PhotoGrid photos={productPhotos} />
          </div>
        </>
      )}



      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button className="w-full" size="lg" onClick={onSubmit} disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {t("qnaSubmitNow")}
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
