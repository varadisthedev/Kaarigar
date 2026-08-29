import { setRequestLocale, getTranslations } from "next-intl/server"

import { listMarketplaceBusinesses } from "@/infra/db/repositories/business.repository"
import { BusinessCard } from "@/components/marketplace/business-card"
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters"

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; state?: string; search?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("marketplace")
  const filters = await searchParams

  const businesses = await listMarketplaceBusinesses({
    category: filters.category,
    state: filters.state,
    search: filters.search,
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <MarketplaceFilters category={filters.category} state={filters.state} search={filters.search} />

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
  )
}
