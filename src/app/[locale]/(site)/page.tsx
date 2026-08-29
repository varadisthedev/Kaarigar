import Image from "next/image"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { listMarketplaceBusinesses } from "@/infra/db/repositories/business.repository"
import { BusinessCard } from "@/components/marketplace/business-card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    numberKey: "1",
    titleEn: "Speak about your craft",
    titleHi: "अपने शिल्प के बारे में बोलें",
    bodyEn: "Tap the mic and describe your business in your own language.",
    bodyHi: "माइक दबाएं और अपनी भाषा में अपना व्यवसाय बताएं।",
  },
  {
    numberKey: "2",
    titleEn: "We write your listing",
    titleHi: "हम आपकी लिस्टिंग लिखते हैं",
    bodyEn: "AI fills in a professional, bilingual listing — just review and proceed.",
    bodyHi: "एआई एक पेशेवर, द्विभाषी लिस्टिंग भरता है — बस समीक्षा करें और आगे बढ़ें।",
  },
  {
    numberKey: "3",
    titleEn: "Get discovered",
    titleHi: "खोजे जाएं",
    bodyEn: "Once approved, buyers across India can find and contact you directly.",
    bodyHi: "स्वीकृत होने के बाद, पूरे भारत के खरीदार सीधे आपसे संपर्क कर सकते हैं।",
  },
]

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("marketplace")
  const tNav = await getTranslations("nav")

  const featured = (await listMarketplaceBusinesses({})).slice(0, 4)

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[70svh] items-center overflow-hidden bg-secondary">
        <Image
          src="https://images.unsplash.com/photo-1622037022824-0c71d511ad76?w=2000&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-start gap-5 px-4 py-16">
          <h1 className="font-heading text-3xl font-medium text-foreground sm:text-4xl">
            {locale === "hi"
              ? "भारत के कारीगरों को सीधे व्यवसायों से जोड़ना"
              : "India's artisans, direct to business buyers"}
          </h1>
          <p className="max-w-xl text-muted-foreground sm:text-lg">
            {locale === "hi"
              ? "अपने शिल्प के बारे में बोलें — हम बाकी संभालते हैं। एक बार स्वीकृत होने पर, पूरे भारत के खरीदार आपको खोज सकते हैं।"
              : "Describe your craft by voice — we handle the rest. Once approved, buyers across India can find you."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/onboard" className={buttonVariants({ size: "lg" })}>
              {tNav("sell")}
            </Link>
            <Link href="/marketplace" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              {t("title")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-16 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.numberKey} className="flex flex-col gap-2">
            <span className="font-heading text-2xl text-primary">{step.numberKey}</span>
            <h3 className="font-heading text-base font-medium text-foreground">
              {locale === "hi" ? step.titleHi : step.titleEn}
            </h3>
            <p className="text-sm text-muted-foreground">{locale === "hi" ? step.bodyHi : step.bodyEn}</p>
          </div>
        ))}
      </section>

      {featured.length > 0 && (
        <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-medium text-foreground">{t("title")}</h2>
            <Link href="/marketplace" className="text-sm text-primary hover:underline">
              {locale === "hi" ? "सभी देखें" : "View all"}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featured.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
