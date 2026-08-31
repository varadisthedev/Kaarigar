"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslations, useLocale } from "next-intl"

import { defaultCountry } from "@/config/countries"
import { normalizePhoneInput, isValidE164 } from "@/core/auth/phone"
import { apiFetch } from "@/lib/api-fetch"
import { useCountdown } from "@/hooks/use-countdown"
import type { BusinessDraft, ProductDraft } from "@/core/business/draft"
import { businessQnaFields } from "@/core/onboarding/qna-fields"

import { LanguageStep } from "./language-step"
import { VoiceQna } from "./voice-qna"
import { LocationStep, type LocationResult } from "./location-step"
import { ProductCaptureFlow, type CapturedProduct } from "./product-capture-flow"
import { ReviewStep } from "./review-step"
import { PhotoUpload, type ReadyPhoto } from "@/components/media/photo-upload"
import { VideoCapture, type ReadyVideo } from "@/components/media/video-capture"
import { CountrySelect } from "@/components/auth/country-select"
import { OtpInput } from "@/components/auth/otp-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

type Step =
  | "language"
  | "business_qna"
  | "location"
  | "business_photos"
  | "video"
  | "product"
  | "phone"
  | "otp"
  | "review"
  | "submitted"

export function OnboardingFlow() {
  const t = useTranslations("onboarding")
  const tAuth = useTranslations("auth")
  const locale = useLocale() as "en" | "hi"

  const [draftId] = React.useState(() => crypto.randomUUID())
  const [step, setStep] = React.useState<Step>("language")

  const [businessDraft, setBusinessDraft] = React.useState<Partial<BusinessDraft>>({})
  const [location, setLocation] = React.useState<LocationResult>({})
  const [businessPhotos, setBusinessPhotos] = React.useState<ReadyPhoto[]>([])
  const [video, setVideo] = React.useState<ReadyVideo | null>(null)
  const [productDraft, setProductDraft] = React.useState<Partial<ProductDraft>>({})
  const [productPrice, setProductPrice] = React.useState<{ priceMin?: number; priceMax?: number }>({})
  const [productPhotos, setProductPhotos] = React.useState<ReadyPhoto[]>([])

  function handleProductCaptured({ draft, price, photos }: CapturedProduct) {
    setProductDraft(draft)
    setProductPrice(price)
    setProductPhotos(photos)
    setStep("phone")
  }

  // Phone/OTP sub-state — identical mechanics to the login page, but this
  // step comes *after* everything else is filled in, per spec: the artisan
  // stays a guest through the whole conversation, and only gets an account
  // right at the end.
  const [dialCode, setDialCode] = React.useState(defaultCountry.dialCode)
  const [nationalNumber, setNationalNumber] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [devCode, setDevCode] = React.useState<string | null>(null)
  const resend = useCountdown(60)

  const phoneE164 = normalizePhoneInput(dialCode, nationalNumber)

  async function sendOtp() {
    setError(null)
    if (!isValidE164(phoneE164)) {
      setError(tAuth("errorInvalidPhone"))
      return
    }
    setPending(true)
    try {
      const res = await apiFetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneE164, purpose: "phone_verify" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === "rate_limited" ? tAuth("errorRateLimited") : tAuth("errorInvalidPhone"))
        return
      }
      setDevCode(data.devCode ?? null)
      setStep("otp")
      resend.start()
    } finally {
      setPending(false)
    }
  }

  async function verifyOtp(code: string) {
    setError(null)
    setPending(true)
    try {
      const verifyRes = await apiFetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneE164, countryCode: dialCode, code, purpose: "phone_verify", locale }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        setError(
          verifyData.error === "invalid_code"
            ? tAuth("errorInvalidOtp")
            : verifyData.error === "too_many_attempts"
              ? tAuth("errorTooManyAttempts")
              : tAuth("errorOtpExpired")
        )
        return
      }
      setError(null)
      setStep("review")
    } finally {
      setPending(false)
    }
  }

  async function submitNow() {
    setError(null)
    setPending(true)
    try {
      const submitRes = await apiFetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId,
          displayName: businessDraft.businessName || "Untitled business",
          craftCategory: businessDraft.craftCategory || "Other",
          descriptionEn: businessDraft.descriptionEn,
          descriptionHi: businessDraft.descriptionHi,
          district: location.district || undefined,
          state: location.state || undefined,
          yearsExperience: businessDraft.yearsExperience,
          monthlyCapacity: businessDraft.monthlyCapacity,
          latitude: location.latitude,
          longitude: location.longitude,
          photos: businessPhotos,
          video: video ?? undefined,
          product:
            productPhotos.length > 0
              ? {
                  titleEn: productDraft.titleEn || "Untitled product",
                  titleHi: productDraft.titleHi,
                  descriptionEn: productDraft.descriptionEn,
                  descriptionHi: productDraft.descriptionHi,
                  materials: productDraft.materials,
                  priceMin: productPrice.priceMin,
                  priceMax: productPrice.priceMax,
                  photos: productPhotos,
                }
              : undefined,
        }),
      })
      if (!submitRes.ok) {
        setError(tAuth("errorInvalidPhone")) // generic — submission failures are rare and logged server-side
        return
      }
      setStep("submitted")
    } finally {
      setPending(false)
    }
  }

  if (step === "language") {
    return (
      <Card>
        <CardContent className="pt-5">
          <LanguageStep onContinue={() => setStep("business_qna")} />
        </CardContent>
      </Card>
    )
  }

  if (step === "business_qna") {
    return (
      <Card>
        <CardContent className="pt-5">
          <VoiceQna
            draftId={draftId}
            locale={locale}
            purpose="business_onboarding"
            fields={businessQnaFields(locale)}
            initialDraft={businessDraft}
            onComplete={(draft) => {
              setBusinessDraft(draft)
              setStep("location")
            }}
          />
        </CardContent>
      </Card>
    )
  }

  if (step === "location") {
    return (
      <Card>
        <CardContent className="pt-5">
          <LocationStep
            locale={locale}
            onContinue={(result) => {
              setLocation(result)
              setStep("business_photos")
            }}
          />
        </CardContent>
      </Card>
    )
  }

  if (step === "business_photos") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("photosTitle")}</CardTitle>
          <CardDescription>{t("photosSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUpload kind="onboarding_photo" draftId={draftId} onChange={setBusinessPhotos} />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => setStep("video")} disabled={businessPhotos.length === 0}>
            {t("qnaNext")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "video") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <VideoCapture draftId={draftId} onChange={setVideo} />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          <Button className="w-full" onClick={() => setStep("product")} disabled={!video}>
            {t("qnaNext")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStep("product")}>
            {t("videoSkip")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "product") {
    return (
      <ProductCaptureFlow
        draftId={draftId}
        locale={locale}
        craftCategory={businessDraft.craftCategory}
        region={location.state}
        initialDraft={productDraft}
        onComplete={handleProductCaptured}
      />
    )
  }

  if (step === "phone") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("submitTitle")}</CardTitle>
          <CardDescription>{t("submitSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onboard-phone">{tAuth("phoneLabel")}</Label>
            <div className="flex gap-2">
              <CountrySelect value={dialCode} onValueChange={setDialCode} disabled={pending} />
              <Input
                id="onboard-phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={tAuth("phonePlaceholder")}
                value={nationalNumber}
                disabled={pending}
                onChange={(e) => setNationalNumber(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={sendOtp} disabled={pending}>
            {tAuth("sendOtp")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "otp") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tAuth("otpTitle")}</CardTitle>
          <CardDescription>{tAuth("otpSubtitle", { phone: phoneE164 })}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {devCode && (
            <Alert>
              <AlertDescription>
                {tAuth("devOtpHint")} <span className="font-mono font-semibold">{devCode}</span>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <OtpInput onComplete={verifyOtp} disabled={pending} invalid={Boolean(error)} />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          <Button variant="ghost" size="sm" disabled={resend.isActive || pending} onClick={sendOtp}>
            {resend.isActive ? tAuth("otpResendIn", { seconds: resend.seconds }) : tAuth("otpResend")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "review") {
    return (
      <Card>
        <CardContent className="pt-5">
          <ReviewStep
            locale={locale}
            businessDraft={businessDraft}
            location={location}
            businessPhotos={businessPhotos}
            video={video}
            productDraft={productDraft}
            productPrice={productPrice}
            productPhotos={productPhotos}
            submitting={pending}
            error={error}
            onSubmit={submitNow}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <Image
        src="/flower.png"
        alt=""
        width={1312}
        height={1199}
        className="pointer-events-none absolute -top-10 -right-10 size-56 object-contain opacity-10"
      />
      <CardHeader className="relative">
        <CardTitle>{t("submittedTitle")}</CardTitle>
        <CardDescription>{t("submittedSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t("submittedTrackHint")}</p>
        {productPhotos.length > 0 && <p className="text-sm text-muted-foreground">{t("submittedProductHint")}</p>}
      </CardContent>
    </Card>
  )
}
