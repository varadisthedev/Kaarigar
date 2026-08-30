import Image from "next/image"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { findBusinessesByOwner, findProductsForOwner } from "@/infra/db/repositories/business.repository"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { formatPriceRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Mic, Camera, Tag, Users, BookOpen, AudioLines } from "lucide-react"

import { SellerHeader } from "@/components/layout/seller-header"
import { SellerTabBar } from "@/components/layout/seller-tab-bar"

/**
 * The main entry point — for everyone, not just signed-in sellers. This is
 * the former `/sell` dashboard, relocated here on purpose: this app is an
 * MVP built to be as low-friction as possible, so there's no separate
 * marketing page to click through first. A guest sees a mic-first prompt to
 * start (which routes into /onboard's own guest-capable voice capture); a
 * signed-in artisan with an approved business sees their real dashboard.
 * Same header/tab-bar as the rest of the seller app, so this never feels
 * like a different, bolted-on page.
 */
export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sell")
  const tNav = await getTranslations("nav")
  const tOnboarding = await getTranslations("onboarding")
  const tProduct = await getTranslations("product")
  const tCommon = await getTranslations("common")

  const session = await getCurrentUser()
  const user = session ? await findUserById(session.sub) : null
  const businesses = session ? await findBusinessesByOwner(session.sub) : []

  const approvedBusinesses = businesses.filter((b) => b.status === "approved")
  const primaryBusiness = approvedBusinesses[0]
  const pendingBusiness = businesses.find((b) => b.status === "pending_review")
  const rejectedBusiness = businesses.find((b) => b.status === "rejected")

  const greetingName = user?.name?.split(" ")[0] ?? ""
  const products = primaryBusiness && session ? await findProductsForOwner(session.sub) : []

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SellerHeader user={session} name={user?.name ?? null} avatarUrl={user?.avatarUrl ?? null} tagline={tCommon("tagline")} loginLabel={tNav("login")} />

      <main className="flex-1 pb-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {session ? (
            <div>
              <h1 className="font-heading text-xl font-medium text-foreground">
                {locale === "hi" ? "नमस्ते" : "Namaste"}
                {greetingName ? `, ${greetingName}` : ""}! 👋
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {locale === "hi"
                  ? "अपने शिल्प को अधिक ग्राहकों तक पहुंचाएं।"
                  : "Let's take your craft to more customers."}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="font-heading text-xl font-medium text-foreground">
                {locale === "hi" ? "अपने शिल्प के साथ शुरुआत करें" : "Get your craft online"}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{tOnboarding("startSubtitle")}</p>
            </div>
          )}

          {pendingBusiness && (
            <div className="border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground">
              <span className="font-medium">{pendingBusiness.displayName}</span> — {t("statusPendingReview")}.{" "}
              <Link href="/sell/businesses" className="text-primary hover:underline">
                {tNav("myBusinesses")}
              </Link>
            </div>
          )}
          {rejectedBusiness && (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
              <span className="font-medium">{rejectedBusiness.displayName}</span> — {t("statusRejected")}
              {rejectedBusiness.rejectionReason ? `: ${rejectedBusiness.rejectionReason}` : ""}
            </div>
          )}

          {businesses.length === 0 ? (
            // Covers both a total guest and a signed-in user with no
            // business yet — same CTA works for either audience.
            <Link
              href="/onboard"
              className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40 sm:gap-5 sm:p-5"
            >
              <span className="relative flex shrink-0 items-center justify-center">
                <span className="absolute size-12 animate-ping rounded-full bg-primary/20 [animation-duration:2.2s] sm:size-14" />
                <span className="relative flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 sm:size-12">
                  <Mic className="size-5 sm:size-6" />
                </span>
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-heading text-base font-semibold text-foreground sm:text-lg">
                  {locale === "hi" ? "कुछ भी बोलिए" : "Say anything"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {locale === "hi"
                    ? "हम आपको पूरी वेबसाइट पर आगे मार्गदर्शन देंगे"
                    : "We'll guide you through the site, step by step"}
                </span>
              </span>
              <AudioLines className="hidden size-8 shrink-0 text-primary/50 sm:block" />
            </Link>
          ) : primaryBusiness ? (
            <>
              {/* Voice hero — routes to the proven Add Product flow (mic capture,
                  extraction, review, photos) rather than a second, half-wired
                  recorder living directly on this page. */}
              <Link
                href={`/sell/${primaryBusiness.id}/products/new`}
                className="flex items-center gap-4 border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mic className="size-7" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-heading text-base font-medium text-foreground">{tOnboarding("startTitle")}</span>
                  <span className="text-sm text-muted-foreground">{tOnboarding("micIdle")}</span>
                </span>
              </Link>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-base font-medium text-foreground">{t("quickActions")}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <QuickAction href={`/sell/${primaryBusiness.id}/products/new`} icon={Camera} label={t("addProduct")} />
                  <QuickAction href="/sell/price-check" icon={Tag} label={tNav("checkPrice")} />
                  <QuickAction href="/inquiries" icon={Users} label={tNav("findBuyers")} />
                  <QuickAction href="/sell/products" icon={BookOpen} label={tNav("myCatalog")} />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-base font-medium text-foreground">{t("yourProducts")}</h2>
                  <Link href="/sell/products" className="text-sm text-primary hover:underline">
                    {t("viewListing")}
                  </Link>
                </div>
                {products.length === 0 ? (
                  <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("noProductsYet")}
                  </p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {products.slice(0, 6).map((product) => {
                      const media = product.media.find((m) => m.isPrimary) ?? product.media[0]
                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug}`}
                          className="flex w-32 shrink-0 flex-col gap-1.5"
                        >
                          <div className="relative aspect-square w-32 overflow-hidden border border-border bg-secondary">
                            {media && (
                              <Image src={media.enhancedUrl ?? media.url} alt={product.titleEn} fill sizes="128px" className="object-cover" />
                            )}
                            <Badge
                              variant={product.status === "published" ? "success" : "secondary"}
                              className="absolute top-1.5 left-1.5"
                            >
                              {product.status === "published" ? tProduct("statusPublished") : tProduct("statusDraft")}
                            </Badge>
                          </div>
                          <p className="truncate text-xs font-medium text-foreground">{product.titleEn}</p>
                          <p className="text-xs text-muted-foreground">{formatPriceRange(product.priceMin, product.priceMax)}</p>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {locale === "hi"
                ? "स्वीकृत होने के बाद यहाँ उत्पाद जोड़ने का विकल्प दिखाई देगा।"
                : "Once a business is approved, you'll be able to add products from here."}
            </p>
          )}
        </div>
      </main>

      <SellerTabBar />
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Mic
  label: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 border border-border bg-card px-2 py-5 text-center transition-colors hover:border-primary/40"
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  )
}
