import Image from "next/image"
import { notFound } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { findBusinessByCode } from "@/infra/db/repositories/business.repository"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { formatPriceRange } from "@/lib/format"

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ locale: string; businessCode: string }>
}) {
  const { locale, businessCode } = await params
  setRequestLocale(locale)
  const t = await getTranslations("marketplace")

  const business = await findBusinessByCode(businessCode)
  if (!business || business.status !== "approved") notFound()

  const description = locale === "hi" ? business.descriptionHi : business.descriptionEn
  const cover = business.media.find((m) => m.isPrimary) ?? business.media[0]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="relative aspect-[3/1] w-full overflow-hidden bg-secondary">
        {cover && (
          <Image src={cover.url} alt={business.displayName} fill sizes="100vw" className="object-cover" priority />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-medium text-foreground">{business.displayName}</h1>
          <Badge variant="success">{t("verifiedBadge")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {business.craftCategory} · {business.district}, {business.state}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("businessCode")}: <span className="font-mono">{business.businessCode}</span>
        </p>
        {description && <p className="mt-2 max-w-2xl text-sm text-foreground">{description}</p>}
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-medium text-foreground">Products</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {business.products
            .filter((p) => p.status === "published")
            .map((product) => {
              const media = product.media.find((m) => m.isPrimary) ?? product.media[0]
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group flex flex-col border border-border bg-card transition-colors hover:border-foreground/20"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-secondary">
                    {media && (
                      <Image
                        src={media.enhancedUrl ?? media.url}
                        alt={locale === "hi" ? product.titleHi ?? product.titleEn : product.titleEn}
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="text-sm font-medium text-foreground">
                      {locale === "hi" ? product.titleHi ?? product.titleEn : product.titleEn}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatPriceRange(product.priceMin, product.priceMax)}</p>
                  </div>
                </Link>
              )
            })}
        </div>
      </div>
    </div>
  )
}
