import Image from "next/image"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { formatPriceRange } from "@/lib/format"
import type { Business, BusinessMedia, Product, ProductMedia } from "@/infra/db/schema"

type BusinessWithRelations = Business & {
  media: BusinessMedia[]
  products: (Product & { media: ProductMedia[] })[]
}

export function BusinessCard({ business }: { business: BusinessWithRelations }) {
  const t = useTranslations("marketplace")
  const cover = business.media.find((m) => m.isPrimary) ?? business.media[0]
  const priceMins = business.products.map((p) => p.priceMin).filter((v): v is string => v != null)
  const priceMaxs = business.products.map((p) => p.priceMax).filter((v): v is string => v != null)
  const min = priceMins.length ? Math.min(...priceMins.map(Number)) : null
  const max = priceMaxs.length ? Math.max(...priceMaxs.map(Number)) : null

  return (
    <Link
      href={`/business/${business.businessCode ?? ""}`}
      className="group flex flex-col border border-border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {cover && (
          <Image
            src={cover.url}
            alt={cover.altEn ?? business.displayName}
            fill
            sizes="(min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        )}
        <Badge variant="success" className="absolute top-2 left-2">
          {t("verifiedBadge")}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="font-heading text-sm font-medium text-foreground">{business.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {business.craftCategory} · {business.state}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{formatPriceRange(min, max)}</p>
        <p className="text-[11px] text-muted-foreground">
          {t("businessCode")}: {business.businessCode}
        </p>
      </div>
    </Link>
  )
}
