"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { useSearchParams } from "next/navigation"

import { useRouter } from "@/i18n/navigation"
import { defaultCountry } from "@/config/countries"
import { normalizePhoneInput, isValidE164 } from "@/core/auth/phone"
import { sanitizeRedirectPath, stripLocalePrefix } from "@/core/auth/redirect-safety"
import { apiFetch } from "@/lib/api-fetch"
import { useCountdown } from "@/hooks/use-countdown"

import { CountrySelect } from "@/components/auth/country-select"
import { OtpInput } from "@/components/auth/otp-input"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Step = "phone" | "otp"

export default function LoginPage() {
  const t = useTranslations("auth")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = sanitizeRedirectPath(searchParams.get("next"), `/${locale}`)

  const oauthErrorCode = searchParams.get("oauthError")
  const oauthErrorMessage = oauthErrorCode
    ? t(
        (
          {
            not_configured: "oauthErrorNotConfigured",
            denied: "oauthErrorDenied",
            invalid_state: "oauthErrorInvalidState",
            failed: "oauthErrorFailed",
          } as const
        )[oauthErrorCode] ?? "oauthErrorFailed"
      )
    : null

  const [step, setStep] = React.useState<Step>("phone")
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
      setError(t("errorInvalidPhone"))
      return
    }
    setPending(true)
    try {
      const res = await apiFetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneE164, purpose: "login" }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === "rate_limited") setError(t("errorRateLimited"))
        else setError(t("errorInvalidPhone"))
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
      const res = await apiFetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneE164, countryCode: dialCode, code, purpose: "login", locale }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === "invalid_code") setError(t("errorInvalidOtp"))
        else if (data.error === "expired_or_not_found") setError(t("errorOtpExpired"))
        else if (data.error === "too_many_attempts") setError(t("errorTooManyAttempts"))
        else setError(t("errorInvalidOtp"))
        return
      }
      if (data.user && !data.user.profileCompleted) {
        const dest = stripLocalePrefix(next, locale)
        router.push(`/account/onboarding${dest && dest !== "/" ? `?redirect=${encodeURIComponent(dest)}` : ""}`)
      } else {
        router.push(stripLocalePrefix(next, locale))
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (step === "otp") {
    return (
      <Card className="gap-6 border-0 bg-transparent p-0 shadow-none">
        <CardHeader className="gap-1 p-0">
          <CardTitle className="text-2xl font-semibold">{t("otpTitle")}</CardTitle>
          <CardDescription>{t("otpSubtitle", { phone: phoneE164 })}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-0">
          {devCode && (
            <Alert>
              <AlertDescription>
                {t("devOtpHint")} <span className="font-mono font-semibold">{devCode}</span>
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
        <CardFooter className="flex flex-col items-stretch gap-3 p-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={resend.isActive || pending}
            onClick={sendOtp}
          >
            {resend.isActive ? t("otpResendIn", { seconds: resend.seconds }) : t("otpResend")}
          </Button>
          <Button variant="link" size="sm" onClick={() => setStep("phone")} disabled={pending}>
            {t("otpChangeNumber")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="gap-6 border-0 bg-transparent p-0 shadow-none">
      <CardHeader className="gap-1 p-0">
        <CardTitle className="text-2xl font-semibold">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        {oauthErrorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{oauthErrorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("phoneLabel")}</Label>
          <div className="flex gap-2">
            <CountrySelect value={dialCode} onValueChange={setDialCode} disabled={pending} />
            <Input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={t("phonePlaceholder")}
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
      <CardFooter className="flex flex-col items-stretch gap-4 p-0">
        <Button className="w-full" onClick={sendOtp} disabled={pending}>
          {t("sendOtp")}
        </Button>
        <OAuthButtons locale={locale} next={next} />
      </CardFooter>
    </Card>
  )
}
