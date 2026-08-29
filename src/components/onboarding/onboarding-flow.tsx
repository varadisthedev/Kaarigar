"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"

import { defaultCountry } from "@/config/countries"
import { normalizePhoneInput, isValidE164 } from "@/core/auth/phone"
import { apiFetch } from "@/lib/api-fetch"
import { useCountdown } from "@/hooks/use-countdown"
import type { BusinessDraft } from "@/core/business/draft"

import { MicButton } from "./mic-button"
import { ReviewForm, draftToFormValues, type ReviewFormValues } from "./review-form"
import { PhotoUpload, type ReadyPhoto } from "@/components/media/photo-upload"
import { CountrySelect } from "@/components/auth/country-select"
import { OtpInput } from "@/components/auth/otp-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

type Step = "voice" | "review" | "photos" | "phone" | "otp" | "submitted"

export function OnboardingFlow({ hasServerSpeech }: { hasServerSpeech: boolean }) {
  const t = useTranslations("onboarding")
  const tAuth = useTranslations("auth")
  const tCommon = useTranslations("common")
  const locale = useLocale() as "en" | "hi"

  const [draftId] = React.useState(() => crypto.randomUUID())
  const [step, setStep] = React.useState<Step>("voice")
  const [draft, setDraft] = React.useState<BusinessDraft | null>(null)
  const [values, setValues] = React.useState<ReviewFormValues | null>(null)
  const [photos, setPhotos] = React.useState<ReadyPhoto[]>([])

  // Phone/OTP sub-state — identical mechanics to the login page, but this
  // step comes *after* the form and photos are already filled in, per spec.
  const [dialCode, setDialCode] = React.useState(defaultCountry.dialCode)
  const [nationalNumber, setNationalNumber] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [devCode, setDevCode] = React.useState<string | null>(null)
  const resend = useCountdown(60)

  const phoneE164 = normalizePhoneInput(dialCode, nationalNumber)

  function handleVoiceResult({ draft }: { transcript: string; draft: BusinessDraft }) {
    setDraft(draft)
    setValues(draftToFormValues(draft, locale))
    setStep("review")
  }

  function handleTypeInstead() {
    setDraft({ confidence: 0 })
    setValues(draftToFormValues({}, locale))
    setStep("review")
  }

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

  async function verifyAndSubmit(code: string) {
    if (!values) return
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

      const submitRes = await apiFetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId,
          displayName: values.businessName || "Untitled business",
          craftCategory: values.craftCategory || "Other",
          descriptionEn: locale === "en" ? values.description : draft?.descriptionEn,
          descriptionHi: locale === "hi" ? values.description : draft?.descriptionHi,
          district: values.district || undefined,
          state: values.state || undefined,
          yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : undefined,
          monthlyCapacity: values.monthlyCapacity || undefined,
          photos,
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

  if (step === "voice") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("startTitle")}</CardTitle>
          <CardDescription>{t("startSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <MicButton
            draftId={draftId}
            locale={locale}
            purpose="business_onboarding"
            hasServerSpeech={hasServerSpeech}
            onResult={handleVoiceResult}
          />
          <Button variant="link" size="sm" onClick={handleTypeInstead}>
            {t("typeInstead")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "review" && values) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reviewTitle")}</CardTitle>
          <CardDescription>{t("reviewSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm values={values} onChange={setValues} locale={locale} />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => setStep("photos")}>
            {tCommon("proceed")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "photos") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("photosTitle")}</CardTitle>
          <CardDescription>{t("photosSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUpload kind="onboarding_photo" draftId={draftId} onChange={setPhotos} />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => setStep("phone")} disabled={photos.length === 0}>
            {tCommon("proceed")}
          </Button>
        </CardFooter>
      </Card>
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
          <OtpInput onComplete={verifyAndSubmit} disabled={pending} invalid={Boolean(error)} />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          <Button variant="ghost" size="sm" disabled={resend.isActive || pending} onClick={sendOtp}>
            {resend.isActive ? tAuth("otpResendIn", { seconds: resend.seconds }) : tAuth("otpResend")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("submittedTitle")}</CardTitle>
        <CardDescription>{t("submittedSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t("submittedTrackHint")}</p>
      </CardContent>
    </Card>
  )
}
