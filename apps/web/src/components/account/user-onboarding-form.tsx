"use client"

import * as React from "react"
import Image from "next/image"
import { useLocale } from "next-intl"
import {
  User as UserIcon,
  AtSign,
  Sparkles,
  Check,
  X,
  Loader2,
  Camera,
  Heart,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { uploadToCloudinary } from "@/lib/cloudinary-upload"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const CRAFT_INTERESTS = [
  { id: "pottery", labelEn: "Pottery & Ceramics", labelHi: "मिट्टी के बर्तन", labelMr: "मातीची भांडी", icon: "🏺" },
  { id: "handloom", labelEn: "Handloom & Weaving", labelHi: "हथकरघा एवं बुनाई", labelMr: "हातमाग व विणकाम", icon: "🧵" },
  { id: "woodcraft", labelEn: "Woodcraft & Carving", labelHi: "काष्ठकला", labelMr: "लाकडी कलाकुसर", icon: "🪵" },
  { id: "jewelry", labelEn: "Handmade Jewelry", labelHi: "हस्तनिर्मित आभूषण", labelMr: "दागिने व अलंकार", icon: "💍" },
  { id: "folkart", labelEn: "Folk Art & Paintings", labelHi: "लोक कला एवं चित्रकारी", labelMr: "लोककला व चित्रे", icon: "🎨" },
  { id: "leather", labelEn: "Leather Craft", labelHi: "चर्मशिल्प", labelMr: "चामड्याच्या वस्तू", icon: "👝" },
  { id: "metal", labelEn: "Metal & Brassware", labelHi: "धातु एवं पीतल शिल्प", labelMr: "पितळ व धातूकाम", icon: "🪔" },
  { id: "textiles", labelEn: "Embroidered Textiles", labelHi: "कशीदाकारी वस्त्र", labelMr: "भरतकाम वस्त्रे", icon: "🧶" },
  { id: "homedecor", labelEn: "Traditional Decor", labelHi: "पारंपरिक सजावट", labelMr: "पारंपारिक सजावट", icon: "🏡" },
]

export function UserOnboardingForm({
  initialName = "",
  initialAvatarUrl = "",
  redirectUrl = "/",
}: {
  initialName?: string
  initialAvatarUrl?: string
  redirectUrl?: string
}) {
  const locale = useLocale() as "en" | "hi" | "mr"

  const [name, setName] = React.useState(initialName)
  const [username, setUsername] = React.useState("")
  const [gender, setGender] = React.useState<"male" | "female" | "other" | "prefer_not_to_say">("male")
  const [avatarUrl, setAvatarUrl] = React.useState(initialAvatarUrl || "/avatars/male.svg")
  const [selectedInterests, setSelectedInterests] = React.useState<string[]>([])
  const [customAvatarUploading, setCustomAvatarUploading] = React.useState(false)

  // Username validation state
  const [usernameChecking, setUsernameChecking] = React.useState(false)
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null)
  const [submitPending, setSubmitPending] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Suggest username when name is typed
  React.useEffect(() => {
    if (!username && name.trim()) {
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16)
      if (clean) {
        setUsername(`${clean}_${Math.floor(100 + Math.random() * 900)}`)
      }
    }
  }, [name, username])

  // Automatically update avatar when gender changes if user is using default avatars
  function handleGenderChange(newGender: "male" | "female" | "other" | "prefer_not_to_say") {
    setGender(newGender)
    if (avatarUrl === "/avatars/male.svg" || avatarUrl === "/avatars/female.svg") {
      setAvatarUrl(newGender === "female" ? "/avatars/female.svg" : "/avatars/male.svg")
    }
  }

  // Live username availability check
  React.useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, "")
    if (!clean || clean.length < 2) {
      setUsernameAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true)
      try {
        const res = await apiFetch(`/api/account/username-check?username=${encodeURIComponent(clean)}`)
        const data = await res.json()
        setUsernameAvailable(data.available)
      } catch {
        setUsernameAvailable(null)
      } finally {
        setUsernameChecking(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username])

  function toggleInterest(id: string) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCustomAvatarUploading(true)
    try {
      const uploaded = await uploadToCloudinary(file, "avatar")
      setAvatarUrl(uploaded.url)
    } catch {
      alert("Failed to upload photo. Using default avatar.")
    } finally {
      setCustomAvatarUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitPending(true)
    setErrorMessage(null)

    try {
      const res = await apiFetch("/api/account/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase().replace(/^@/, ""),
          gender,
          avatarUrl,
          shoppingInterest: selectedInterests.join(", "),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.message || "Failed to complete profile. Please try again.")
        return
      }

      // Profile completed successfully — forward user to target destination
      window.location.href = redirectUrl
    } catch {
      setErrorMessage("Something went wrong. Please try again.")
    } finally {
      setSubmitPending(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-6 shadow-xl backdrop-blur-md sm:p-10">
      {/* Decorative spinning flower background */}
      <Image
        src="/flower.png"
        alt=""
        aria-hidden="true"
        width={320}
        height={320}
        className="pointer-events-none absolute -top-16 -right-16 z-0 w-48 opacity-10 select-none animate-[spin_40s_linear_infinite]"
      />

      <div className="relative z-10">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Sparkles className="size-7" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {locale === "mr"
              ? "आपले प्रोफाइल तयार करा"
              : locale === "hi"
                ? "अपनी प्रोफ़ाइल पूरी करें"
                : "Complete Your Profile"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {locale === "mr"
              ? "कारागिरांशी संवाद साधण्यासाठी आणि खरेदी करण्यासाठी तुमचे युजरनेम व अवतार निवडा."
              : locale === "hi"
                ? "कारीगरों से जुड़ने और खरीदारी के लिए अपना उपनाम व अवतार चुनें।"
                : "Choose your unique handle, avatar, and craft interests to personalize your experience."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          {/* Avatar Selector & Preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="size-24 sm:size-28 overflow-hidden rounded-full border-4 border-primary/20 shadow-md transition-all hover:border-primary">
                {customAvatarUploading ? (
                  <div className="flex size-full items-center justify-center bg-secondary">
                    <Loader2 className="size-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Image
                    src={avatarUrl}
                    alt="Profile Avatar"
                    width={112}
                    height={112}
                    className="size-full object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
                title="Upload custom photo"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Default Avatar Quick Pickers */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAvatarUrl("/avatars/male.svg")}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  avatarUrl === "/avatars/male.svg"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                <Image src="/avatars/male.svg" alt="Male Avatar" width={20} height={20} className="rounded-full" />
                {locale === "mr" ? "पुरुष अवतार" : locale === "hi" ? "पुरुष अवतार" : "Male Avatar"}
              </button>
              <button
                type="button"
                onClick={() => setAvatarUrl("/avatars/female.svg")}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  avatarUrl === "/avatars/female.svg"
                    ? "border-pink-600 bg-pink-500/10 text-pink-700 dark:text-pink-300 font-semibold"
                    : "border-border bg-card text-muted-foreground hover:border-pink-400"
                )}
              >
                <Image src="/avatars/female.svg" alt="Female Avatar" width={20} height={20} className="rounded-full" />
                {locale === "mr" ? "स्त्री अवतार" : locale === "hi" ? "महिला अवतार" : "Female Avatar"}
              </button>
            </div>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-name" className="text-xs font-medium">
                {locale === "mr" ? "संपूर्ण नाव" : locale === "hi" ? "पूरा नाम" : "Full Name"} *
              </Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="h-11 pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-handle" className="text-xs font-medium">
                {locale === "mr" ? "युनिक युजरनेम" : locale === "hi" ? "अनूठा उपनाम" : "Unique Username"} *
              </Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="user-handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                  placeholder="e.g. rajesh_art"
                  className="h-11 pr-10 pl-9 text-sm font-medium"
                  required
                />
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {usernameChecking ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : usernameAvailable === true ? (
                    <span title="Username available">
                      <Check className="size-4 text-emerald-600" />
                    </span>
                  ) : usernameAvailable === false ? (
                    <span title="Username taken">
                      <X className="size-4 text-destructive" />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Gender Selection */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">
              {locale === "mr" ? "लिंग" : locale === "hi" ? "लिंग" : "Gender"}
            </Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: "male", label: locale === "mr" ? "पुरुष" : locale === "hi" ? "पुरुष" : "Male", emoji: "👨" },
                { id: "female", label: locale === "mr" ? "स्त्री" : locale === "hi" ? "महिला" : "Female", emoji: "👩" },
                { id: "other", label: locale === "mr" ? "इतर" : locale === "hi" ? "अन्य" : "Other", emoji: "🧑" },
                { id: "prefer_not_to_say", label: locale === "mr" ? "सांगू इच्छित नाही" : locale === "hi" ? "कहना नहीं" : "Prefer not to say", emoji: "✨" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleGenderChange(item.id as any)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all",
                    gender === item.id
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20"
                      : "border-border bg-card text-foreground hover:border-foreground/30"
                  )}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Craft Interests */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {locale === "mr" ? "आपल्या आवडीचे हस्तकला प्रकार" : locale === "hi" ? "आपकी पसंदीदा हस्तकला" : "Craft Interests & Preferences"}
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {selectedInterests.length} {locale === "mr" ? "निवडले" : locale === "hi" ? "चुने गए" : "selected"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CRAFT_INTERESTS.map((cat) => {
                const isSelected = selectedInterests.includes(cat.id)
                const title = locale === "mr" ? cat.labelMr : locale === "hi" ? cat.labelHi : cat.labelEn
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleInterest(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-medium shadow-xs"
                        : "border-border bg-secondary/40 text-foreground hover:border-primary/40 hover:bg-secondary/70"
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{title}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive">
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitPending || !name.trim() || usernameAvailable === false}
            className="h-12 w-full text-base font-semibold shadow-md gap-2"
          >
            {submitPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <span>
                  {locale === "mr"
                    ? "प्रोफाइल पूर्ण करा"
                    : locale === "hi"
                      ? "प्रोफ़ाइल पूर्ण करें"
                      : "Complete Profile & Explore"}
                </span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="mr-1 inline-block size-3.5 text-primary" />
            {locale === "mr"
              ? "तुमची माहिती सुरक्षित आहे व ती चॅट्स आणि ऑर्डर्ससाठी वापरली जाईल."
              : locale === "hi"
                ? "आपकी जानकारी सुरक्षित है और चैट तथा ऑर्डर के लिए उपयोग की जाएगी।"
                : "Your unique username and avatar will be shown in chats, inquiries, and orders."}
          </p>
        </form>
      </div>
    </div>
  )
}
