import Image from "next/image"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { Mic, Camera, Tag, Users, BookOpen, AudioLines, Package, IndianRupee, MapPin, Lightbulb, TrendingUp, Bot, ChevronRight } from "lucide-react"

import { getCurrentUser } from "@/infra/http/current-user"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { findBusinessesByOwner, listFeaturedProducts, getLikedProductIds } from "@/infra/db/repositories/business.repository"
import { getPlatformStats, getTopCraftCategoryInsight, getPopularProductTags, getBusinessWeeklyInsight } from "@/infra/db/repositories/stats.repository"
import { Link } from "@/i18n/navigation"
import { formatCompactCount, formatCompactInr } from "@/lib/format"
import { cn } from "@/lib/utils"

import { SellerHeader } from "@/components/layout/seller-header"
import { SellerTabBar } from "@/components/layout/seller-tab-bar"
import { HomeSearchBar } from "@/components/home/home-search-bar"
import { FeaturedProductCard } from "@/components/home/featured-product-card"
import { HorizontalScroller } from "@/components/home/horizontal-scroller"
import { CategoryStrip } from "@/components/home/category-strip"

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
  const tCommon = await getTranslations("common")

  const session = await getCurrentUser()
  const user = session ? await findUserById(session.sub) : null
  const businesses = session ? await findBusinessesByOwner(session.sub) : []

  const approvedBusinesses = businesses.filter((b) => b.status === "approved")
  const primaryBusiness = approvedBusinesses[0]
  const pendingBusiness = businesses.find((b) => b.status === "pending_review")
  const rejectedBusiness = businesses.find((b) => b.status === "rejected")

  const greetingName = user?.name?.split(" ")[0] ?? ""

  // Discovery content — real, platform-wide, shown to every visitor
  // (guest or seller), never the viewer's own listings.
  const [stats, featuredProducts, insight, trendingTags] = await Promise.all([
    getPlatformStats(),
    listFeaturedProducts({ excludeOwnerId: session?.sub, limit: 12 }),
    getTopCraftCategoryInsight(),
    getPopularProductTags(6),
  ])
  const likedProductIds = session
    ? await getLikedProductIds(
        session.sub,
        featuredProducts.map((p) => p.id)
      )
    : new Set<string>()

  // Real weekly activity for the seller's own business — never shown for a
  // guest or a seller without an approved business yet.
  const weeklyInsight = primaryBusiness ? await getBusinessWeeklyInsight(primaryBusiness.id) : null

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Image
        src="/flower.png"
        alt=""
        aria-hidden="true"
        width={480}
        height={480}
        priority
        className="pointer-events-none fixed top-1/2 left-0 z-0 w-56 -translate-x-1/2 -translate-y-1/2 animate-[spin_25s_linear_infinite] opacity-80 select-none sm:w-72 md:w-96"
      />

      <SellerHeader user={session} name={user?.name ?? null} avatarUrl={user?.avatarUrl ?? null} tagline={tCommon("tagline")} loginLabel={tNav("login")} />

      <main className="flex-1 pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {session ? (
              <div>
                <h1 className="font-heading text-xl font-medium text-foreground">
                  {locale === "hi" ? "नमस्ते" : "Namaste"}
                  {greetingName ? (
                    <>
                      , <span className="text-primary">{greetingName}</span>
                    </>
                  ) : (
                    ""
                  )}
                  ! 👋
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

            <div className="sm:w-[420px] sm:shrink-0">
              <HomeSearchBar />
            </div>
          </div>

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
            // Unauthenticated visitors are sent to login with a redirect back to onboarding,
            // while signed-in users without a business go straight to /onboard.
            <VoiceHero
              href={session ? "/onboard" : "/login?redirect=/onboard"}
              title={t("heroTitle")}
              subtitle={t("heroSubtitle")}
              example={t("heroExample")}
            />
          ) : primaryBusiness ? (
            <>
              {/* Voice hero — routes to the proven Add Product flow (mic capture,
                  extraction, review, photos) rather than a second, half-wired
                  recorder living directly on this page. */}
              <VoiceHero
                href={`/sell/${primaryBusiness.id}/products/new`}
                title={t("heroTitle")}
                subtitle={t("heroSubtitle")}
                example={t("heroExample")}
              />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-base font-medium text-foreground">{t("quickActions")}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <QuickAction href={`/sell/${primaryBusiness.id}/products/new`} icon={Camera} label={t("addProduct")} />
                  <QuickAction href="/sell/price-check" icon={Tag} label={tNav("checkPrice")} />
                  <QuickAction href="/inquiries" icon={Users} label={tNav("chats")} />
                  <QuickAction href="/sell/products" icon={BookOpen} label={tNav("myCatalog")} />
                </div>
              </div>

              {weeklyInsight && (
                <div className="flex flex-col gap-3 border border-primary/20 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-primary">{t("businessAssistantTitle")}</p>
                      <p className="mt-0.5 text-sm text-foreground">
                        {weeklyInsight.views + weeklyInsight.inquiries + weeklyInsight.shortlisted > 0
                          ? t("businessAssistantMessage")
                          : t("businessAssistantEmpty")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("businessAssistantStats", {
                          views: weeklyInsight.views,
                          inquiries: weeklyInsight.inquiries,
                          shortlisted: weeklyInsight.shortlisted,
                        })}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/sell/products"
                    className="inline-flex shrink-0 items-center gap-1 self-start border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 sm:self-center"
                  >
                    {t("viewInsights")}
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {locale === "hi"
                ? "स्वीकृत होने के बाद यहाँ उत्पाद जोड़ने का विकल्प दिखाई देगा।"
                : "Once a business is approved, you'll be able to add products from here."}
            </p>
          )}

          {/* Real, platform-wide numbers — never hardcoded marketing copy. */}
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
            <StatTile icon={Users} value={formatCompactCount(stats.activeBuyers)} label={t("statsActiveBuyers")} />
            <StatTile icon={Package} value={formatCompactCount(stats.productsListed)} label={t("statsProductsListed")} />
            <StatTile icon={IndianRupee} value={formatCompactInr(stats.dealsTotalAmount)} label={t("statsDealsCompleted")} />
            <StatTile icon={MapPin} value={formatCompactCount(stats.statesConnected)} label={t("statsStatesConnected")} />
          </div>

          <CategoryStrip locale={locale} title={t("exploreCrafts")} seeAll={t("seeAll")} more={t("more")} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-base font-medium text-foreground">{t("featuredCommunity")}</h2>
            </div>
            {featuredProducts.length === 0 ? (
              <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t("noFeaturedYet")}
              </p>
            ) : (
              <HorizontalScroller>
                {featuredProducts.map((product) => (
                  <FeaturedProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    liked={likedProductIds.has(product.id)}
                    currentUserId={session?.sub ?? null}
                  />
                ))}
              </HorizontalScroller>
            )}
          </div>

          {(insight || trendingTags.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {insight && (
                <div className="flex items-start gap-3 border border-border bg-card p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lightbulb className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-primary">{t("todaysInsight")}</p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {insight.state
                        ? t("insightWithState", { category: insight.category, state: insight.state })
                        : t("insightNoState", { category: insight.category })}
                    </p>
                  </div>
                </div>
              )}

              {trendingTags.length > 0 && (
                <div className="flex items-start gap-3 border border-border bg-card p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/70">
                    <TrendingUp className="size-4.5" />
                  </span>
                  <div className="flex flex-1 flex-col gap-2">
                    <p className="text-sm font-medium text-primary">{t("trendingSearches")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {trendingTags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/marketplace?search=${encodeURIComponent(tag)}`}
                          className="border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:border-primary/40"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <SellerTabBar />
    </div>
  )
}

function VoiceHero({
  href,
  title,
  subtitle,
  example,
}: {
  href: string
  title: string
  subtitle: string
  example: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-secondary/50 to-background p-6 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:gap-8 sm:p-10"
    >
      <div className="relative z-10 flex-1">
        <h2 className="font-heading text-2xl font-semibold text-balance text-foreground sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>

        <div className="mt-4 flex items-center gap-2.5 text-sm font-medium text-foreground/80">
          <span>हिंदी</span>
          <span className="text-border">|</span>
          <span>मराठी</span>
          <span className="text-border">|</span>
          <span>English</span>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
          <span className="size-3 shrink-0 rounded-full border border-muted-foreground/40" />
          {example}
        </div>
      </div>

      <div className="relative z-10 mt-8 flex shrink-0 items-center gap-4 sm:mt-0">
        <span className="relative flex size-20 shrink-0 items-center justify-center sm:size-24">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2.2s]" />
          <span className="absolute inset-1 rounded-full border border-primary/25" />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform group-hover:scale-105 sm:size-20">
            <Mic className="size-7 sm:size-8" />
          </span>
        </span>
        <AudioLines className="hidden size-10 shrink-0 text-primary/50 sm:block" />
      </div>

      <Image
        src="/dialog.png"
        alt=""
        aria-hidden="true"
        width={900}
        height={506}
        className="pointer-events-none absolute right-0 bottom-0 z-0 w-52 translate-x-4 translate-y-4 opacity-90 select-none sm:w-72 md:w-80"
      />
    </Link>
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

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Mic
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5 bg-card px-3 py-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
