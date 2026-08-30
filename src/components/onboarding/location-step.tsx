"use client"

import * as React from "react"
import { Loader2, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"

import { useGeolocation } from "@/hooks/use-geolocation"
import { INDIAN_STATES } from "@/core/business/business-code"
import { TalkingPrompt } from "./talking-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type LocationResult = {
  state?: string
  district?: string
  latitude?: number
  longitude?: number
}

export function LocationStep({
  locale,
  onContinue,
}: {
  locale: "en" | "hi"
  onContinue: (result: LocationResult) => void
}) {
  const t = useTranslations("onboarding")
  const geo = useGeolocation()
  const [manual, setManual] = React.useState(false)
  const [state, setState] = React.useState("")
  const [district, setDistrict] = React.useState("")
  const [geocoding, setGeocoding] = React.useState(false)
  const coordsRef = React.useRef<{ latitude: number; longitude: number } | null>(null)

  async function handleShareLocation() {
    const coords = await geo.request()
    if (!coords) return
    coordsRef.current = coords
    setGeocoding(true)
    try {
      const res = await fetch(`/api/onboarding/geocode?lat=${coords.latitude}&lng=${coords.longitude}`)
      const data = await res.json()
      if (data.ok) {
        if (data.state) setState(data.state)
        if (data.district) setDistrict(data.district)
      }
    } finally {
      setGeocoding(false)
    }
  }

  const detected = geo.status === "done" && !geocoding && (state || district)

  function handleContinue() {
    onContinue({
      state: state || undefined,
      district: district || undefined,
      latitude: coordsRef.current?.latitude,
      longitude: coordsRef.current?.longitude,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <TalkingPrompt promptKey="promptLocationIntro" locale={locale} text={t("promptLocationIntro")} />

      {!manual && geo.status !== "done" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Button onClick={handleShareLocation} disabled={geo.status === "locating"} size="lg">
            {geo.status === "locating" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("locationLocating")}
              </>
            ) : (
              <>
                <MapPin className="size-4" />
                {t("locationShareCta")}
              </>
            )}
          </Button>
          {geo.status === "error" && <p className="text-sm text-destructive">{t("locationDenied")}</p>}
          <Button variant="link" size="sm" onClick={() => setManual(true)}>
            {t("locationSkip")}
          </Button>
        </div>
      )}

      {(manual || geo.status === "done" || geo.status === "error") && (
        <div className="flex flex-col gap-4">
          {detected && <p className="text-sm text-muted-foreground">{t("locationDetected")}</p>}
          {geocoding && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("locationLocating")}
            </p>
          )}

          {(manual || geo.status === "done" || geo.status === "error") && !geocoding && (
            <>
              {geo.status === "done" && <p className="text-xs text-muted-foreground">{t("locationEditPrompt")}</p>}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loc-state">{t("fieldState")}</Label>
                <Select
                  value={state}
                  onValueChange={(v) => setState(v as string)}
                  items={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                >
                  <SelectTrigger id="loc-state">
                    <SelectValue placeholder={t("fieldState")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loc-district">{t("fieldDistrict")}</Label>
                <Input id="loc-district" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleContinue}>
                {t("qnaNext")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
