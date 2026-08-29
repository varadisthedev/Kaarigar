import Image from "next/image"
import { notFound } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { findProductBySlug } from "@/infra/db/repositories/business.repository"
import { getCurrentUser } from "@/infra/http/current-user"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { formatPriceRange } from "@/lib/format"
import { InquiryPanel } from "@/components/product/inquiry-panel"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations("product")

  const product = await findProductBySlug(slug)
  if (!product || product.status !== "published") notFound()

  const user = await getCurrentUser()
  const title = locale === "hi" ? product.titleHi ?? product.titleEn : product.titleEn
  const description = locale === "hi" ? product.descriptionHi ?? product.descriptionEn : product.descriptionEn
  const primaryMedia = product.media.find((m) => m.isPrimary) ?? product.media[0]

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-4 py-8 md:grid-cols-2">
      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
        {primaryMedia && (
          <Image
            src={primaryMedia.enhancedUrl ?? primaryMedia.url}
            alt={title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Link href={`/business/${product.business.businessCode}`} className="text-xs text-muted-foreground hover:text-foreground">
            {product.business.displayName}
          </Link>
          <h1 className="font-heading text-2xl font-medium text-foreground">{title}</h1>
          <p className="mt-1 text-lg font-medium text-foreground">
            {formatPriceRange(product.priceMin, product.priceMax)}
          </p>
        </div>

        {description && <p className="text-sm text-foreground">{description}</p>}

        <div className="flex flex-wrap gap-2">
          {product.materials?.map((m) => (
            <Badge key={m} variant="outline">
              {m}
            </Badge>
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
          {product.dimensions && (
            <div>
              <dt className="text-muted-foreground">{t("dimensions")}</dt>
              <dd className="text-foreground">{product.dimensions}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">MOQ</dt>
            <dd className="text-foreground">
              {product.moq} {product.unit}
            </dd>
          </div>
          {product.leadTimeDays != null && (
            <div>
              <dt className="text-muted-foreground">Lead time</dt>
              <dd className="text-foreground">{product.leadTimeDays} days</dd>
            </div>
          )}
        </dl>

        <InquiryPanel businessId={product.businessId} productId={product.id} currentUserId={user?.sub ?? null} />
      </div>
    </div>
  )
}
