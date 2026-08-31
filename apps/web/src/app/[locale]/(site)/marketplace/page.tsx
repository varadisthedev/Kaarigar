import Image from "next/image"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { listMarketplaceBusinesses } from "@/infra/db/repositories/business.repository"
import { PRICE_BANDS, MOQ_BANDS } from "@/config/marketplace-bands"
import { BusinessCard } from "@/components/marketplace/business-card"
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters"

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; state?: string; search?: string; price?: string; moq?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("marketplace")
  const filters = await searchParams

  const priceBand = filters.price ? PRICE_BANDS[filters.price] : undefined
  const moqMax = filters.moq ? MOQ_BANDS[filters.moq] : undefined

  const allBusinesses = await listMarketplaceBusinesses({
    category: filters.category,
    state: filters.state,
    search: filters.search,
    priceMin: priceBand?.min,
    priceMax: priceBand?.max,
    moqMax,
  })

  // The repository filters *which products* attach to each business, not
  // which businesses come back — a business with no product in the
  // requested price/MOQ band still returns, just with an empty product
  // list. Drop those here so the grid only shows genuine matches.
  const hasProductFilter = priceBand != null || moqMax != null
  const businesses = hasProductFilter ? allBusinesses.filter((b) => b.products.length > 0) : allBusinesses

  return (
    <div className="relative overflow-hidden">
      <Image
        src="/flower.png"
        alt=""
        aria-hidden
        width={1312}
        height={1199}
        className="pointer-events-none absolute -top-16 -right-16 z-0 size-72 object-contain opacity-10"
      />
      <Image
        src="/bottomleft.png"
        alt=""
        aria-hidden
        width={1672}
        height={954}
        className="pointer-events-none absolute -bottom-10 -left-10 z-0 w-72 opacity-10"
      />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <MarketplaceFilters
          category={filters.category}
          state={filters.state}
          search={filters.search}
          price={filters.price}
          moq={filters.moq}
        />

        {businesses.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t("noResults")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
