import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import {
  findProductsForOwner,
  countInquiriesByProductIds,
  type ProductSort,
} from "@/infra/db/repositories/business.repository"
import { ProductCard } from "@/components/sell/product-card"
import { CatalogFilters } from "@/components/sell/catalog-filters"

const VALID_SORTS: ProductSort[] = ["newest", "oldest", "priceAsc", "priceDesc", "views", "likes"]

export default async function MyCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { locale } = await params
  const { q, sort } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("sell")
  const tNav = await getTranslations("nav")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const validSort = VALID_SORTS.includes(sort as ProductSort) ? (sort as ProductSort) : "newest"
  const products = await findProductsForOwner(user.sub, { q, sort: validSort })
  const inquiryCounts = await countInquiriesByProductIds(products.map((p) => p.id))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{tNav("myCatalog")}</h1>

      <CatalogFilters q={q} sort={sort} />

      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{q ? t("noProductsMatch") : t("noProductsYet")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} inquiryCount={inquiryCounts[product.id] ?? 0} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
