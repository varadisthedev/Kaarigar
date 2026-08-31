import Image from "next/image"
import { BadgeCheck, MapPin } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { LikeButton } from "@/components/product/like-button"
import { formatPriceRange } from "@/lib/format"
import type { Product, ProductMedia, Business } from "@/infra/db/schema"

type FeaturedProduct = Product & { media: ProductMedia[]; business: Business }

/** The home page's "featured from the community" card — other artisans'
 * published listings, never the viewer's own (filtered by the caller). */
export async function FeaturedProductCard({
  product,
  locale,
  liked,
  currentUserId,
}: {
  product: FeaturedProduct
  locale: string
  liked: boolean
  currentUserId: string | null
}) {
  const t = await getTranslations("product")

  const media = product.media.find((m) => m.isPrimary) ?? product.media[0]
  const title = locale === "hi" ? (product.titleHi ?? product.titleEn) : product.titleEn
  const productHref = `/product/${product.slug}`

  return (
    <div className="flex w-40 shrink-0 flex-col gap-1.5 sm:w-44">
      <div className="relative aspect-square w-full overflow-hidden border border-border bg-secondary">
        <Link href={productHref} className="absolute inset-0">
          {media && (
            <Image src={media.enhancedUrl ?? media.url} alt={title} fill sizes="176px" className="object-cover" />
          )}
        </Link>
        <Badge variant="success" className="pointer-events-none absolute top-2 left-2">
          {t("statusPublished")}
        </Badge>
        <div className="absolute top-2 right-2">
          <LikeButton
            productId={product.id}
            initialLiked={liked}
            initialCount={product.likeCount}
            currentUserId={currentUserId}
            variant="icon"
          />
        </div>
      </div>

      <Link href={productHref} className="flex flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        <span className="flex items-center gap-1 truncate text-xs text-primary">
          <BadgeCheck className="size-3.5 shrink-0 fill-primary text-primary-foreground" />
          <span className="truncate">{product.business.displayName}</span>
        </span>
        <span className="text-sm font-medium text-foreground">{formatPriceRange(product.priceMin, product.priceMax)}</span>
        {(product.business.district || product.business.state) && (
          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">
              {[product.business.district, product.business.state].filter(Boolean).join(", ")}
            </span>
          </span>
        )}
      </Link>
    </div>
  )
}
