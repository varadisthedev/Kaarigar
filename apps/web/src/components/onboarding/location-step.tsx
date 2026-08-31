"use client"

import * as React from "react"
import { Loader2, MapPin, Search, CheckCircle2, Sparkles, Navigation } from "lucide-react"
import { useTranslations } from "next-intl"

import { useGeolocation } from "@/hooks/use-geolocation"
import { INDIAN_STATES } from "@/core/business/business-code"
import { TalkingPrompt } from "./talking-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

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
  locale: "en" | "hi" | "mr"
  onContinue: (result: LocationResult) => void
}) {
  const t = useTranslations("onboarding")
  const geo = useGeolocation()
  const [state, setState] = React.useState("")
  const [district, setDistrict] = React.useState("")
  const [pincode, setPincode] = React.useState("")
  const [locating, setLocating] = React.useState(false)
  const [pinSearching, setPinSearching] = React.useState(false)
  const [detectedSource, setDetectedSource] = React.useState<"gps" | "ip" | "pincode" | null>(null)
  const coordsRef = React.useRef<{ latitude: number; longitude: number } | null>(null)

  // Auto-attempt IP detection on mount if empty
  React.useEffect(() => {
    let active = true
    async function detectIp() {
      if (state || district) return
      try {
        const res = await fetch("/api/onboarding/geocode")
        if (!active) return
        const data = await res.json()
        if (data.ok && data.state) {
          setState(data.state)
          if (data.district) setDistrict(data.district)
          setDetectedSource("ip")
        }
      } catch {
        // silent fallback to manual
      }
    }
    detectIp()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-lookup when user types 6-digit PIN code
  async function handlePincodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6)
    setPincode(digits)
    if (digits.length === 6) {
      setPinSearching(true)
      try {
        const res = await fetch(`/api/onboarding/geocode?pincode=${digits}`)
        const data = await res.json()
        if (data.ok && data.state) {
          setState(data.state)
          if (data.district) setDistrict(data.district)
          setDetectedSource("pincode")
          toast.success("PIN Code matched!", `${data.district ? `${data.district}, ` : ""}${data.state}`)
        } else {
          toast.error("PIN Code not found. Please enter State/District manually.")
        }
      } catch {
        toast.error("Could not fetch PIN code.")
      } finally {
        setPinSearching(false)
      }
    }
  }

  async function handleShareLocation() {
    setLocating(true)
    try {
      const coords = await geo.request()
      if (coords) {
        coordsRef.current = coords
        const res = await fetch(`/api/onboarding/geocode?lat=${coords.latitude}&lng=${coords.longitude}`)
        const data = await res.json()
        if (data.ok && data.state) {
          setState(data.state)
          if (data.district) setDistrict(data.district)
          setDetectedSource("gps")
          toast.success("GPS Location detected!", `${data.district ? `${data.district}, ` : ""}${data.state}`)
        }
      }
    } catch (e) {
      console.warn("[location-step] Location fetch error:", e)
      toast.error("Could not detect GPS location. Please select your State.")
    } finally {
      setLocating(false)
    }
  }

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

      {/* Location Detection Banner & Quick Actions */}
      <div className="rounded-xl border border-border bg-card/60 p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Navigation className={cn("size-5", locating && "animate-spin")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {detectedSource
                  ? locale === "mr"
                    ? "स्थान शोधले गेले आहे"
                    : locale === "hi"
                      ? "स्थान प्राप्त हुआ"
                      : "Location Detected"
                  : locale === "mr"
                    ? "आपले स्थान निश्चित करा"
                    : locale === "hi"
                      ? "अपना स्थान चुनें"
                      : "Choose Your Craft Location"}
              </p>
              <p className="text-xs text-muted-foreground">
                {state && district ? `${district}, ${state}` : t("locationEditPrompt")}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareLocation}
            disabled={locating}
            className="h-9 gap-1.5 self-start text-xs sm:self-auto"
          >
            {locating ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5 text-primary" />}
            {locating ? t("locationLocating") : t("locationShareCta")}
          </Button>
        </div>
      </div>

      {/* PIN Code Lookup Card */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loc-pin" className="text-xs font-medium">
          {locale === "mr" ? "पिन कोड (६ अंक)" : locale === "hi" ? "पिन कोड (6 अंक)" : "PIN Code (6 digits)"}
        </Label>
        <div className="relative">
          <Input
            id="loc-pin"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            placeholder={
              locale === "mr"
                ? "उदा. 400001 (आपोआप राज्य व जिल्हा भरेल)"
                : locale === "hi"
                  ? "उदा. 110001 (स्वतः राज्य व जिला भरेगा)"
                  : "e.g. 110001 (auto-fills state & district)"
            }
            className="h-11 pl-9 text-sm"
          />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          {pinSearching && (
            <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-primary" />
          )}
        </div>
      </div>

      {/* State & District Select / Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loc-state" className="text-xs font-medium">
            {t("fieldState")}
          </Label>
          <Select
            value={state}
            onValueChange={(v) => setState(v as string)}
            items={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
          >
            <SelectTrigger id="loc-state" className="h-11 text-sm">
              <SelectValue placeholder={t("fieldState")} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {INDIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loc-district" className="text-xs font-medium">
            {t("fieldDistrict")}
          </Label>
          <Input
            id="loc-district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={
              locale === "mr" ? "जिल्हा किंवा शहर" : locale === "hi" ? "जिला या शहर" : "District or City"
            }
            className="h-11 text-sm"
          />
        </div>
      </div>

      <Button
        size="lg"
        className="h-12 w-full text-base font-semibold"
        onClick={handleContinue}
        disabled={!state && !district}
      >
        {t("qnaNext")}
      </Button>
    </div>
  )
}
