import Image from "next/image"
import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findProductsForOwner } from "@/infra/db/repositories/business.repository"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { formatPriceRange } from "@/lib/format"

export default async function MyCatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sell")
  const tProduct = await getTranslations("product")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const products = await findProductsForOwner(user.sub)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{t("myCatalog")}</h1>

      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("noProductsYet")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((product) => {
            const media = product.media.find((m) => m.isPrimary) ?? product.media[0]
            return (
              <Link key={product.id} href={`/product/${product.slug}`} className="flex flex-col gap-1.5">
                <div className="relative aspect-square w-full overflow-hidden border border-border bg-secondary">
                  {media && (
                    <Image
                      src={media.enhancedUrl ?? media.url}
                      alt={product.titleEn}
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  )}
                  <Badge
                    variant={product.status === "published" ? "success" : "secondary"}
                    className="absolute top-1.5 left-1.5"
                  >
                    {product.status === "published" ? tProduct("statusPublished") : tProduct("statusDraft")}
                  </Badge>
                </div>
                <p className="truncate text-sm font-medium text-foreground">{product.titleEn}</p>
                <p className="text-xs text-muted-foreground">{product.business.displayName}</p>
                <p className="text-sm text-foreground">{formatPriceRange(product.priceMin, product.priceMax)}</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
