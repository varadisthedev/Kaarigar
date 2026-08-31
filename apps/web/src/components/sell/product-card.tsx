import Image from "next/image"
import { Eye, Heart, MessageSquare, Pencil } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { ShareButton } from "@/components/product/share-button"
import { formatPriceRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Product, ProductMedia, Business } from "@/infra/db/schema"

type ProductWithRelations = Product & { media: ProductMedia[]; business: Business }

/** A "stitched" seam — dashed strips inset from the card edge, dots spaced
 * far apart — rather than a plain border, per the reference design. */
function StitchedSeam() {
  const horizontal = "repeating-linear-gradient(to right, var(--primary) 0 3px, transparent 3px 13px)"
  const vertical = "repeating-linear-gradient(to bottom, var(--primary) 0 3px, transparent 3px 13px)"
  return (
    <div aria-hidden className="pointer-events-none absolute inset-2 opacity-90">
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundImage: horizontal }} />
      <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundImage: horizontal }} />
      <div className="absolute inset-y-0 left-0 w-[2px]" style={{ backgroundImage: vertical }} />
      <div className="absolute inset-y-0 right-0 w-[2px]" style={{ backgroundImage: vertical }} />
    </div>
  )
}

export async function ProductCard({
  product,
  inquiryCount,
  locale,
}: {
  product: ProductWithRelations
  inquiryCount: number
  locale: string
}) {
  const t = await getTranslations("product")
  const tCommon = await getTranslations("common")

  const media = product.media.find((m) => m.isPrimary) ?? product.media[0]
  const title = locale === "hi" ? (product.titleHi ?? product.titleEn) : product.titleEn
  const productHref = `/product/${product.slug}`

  const statusVariant =
    product.status === "published" ? "success" : product.status === "archived" ? "secondary" : "warning"
  const statusLabel =
    product.status === "published"
      ? t("statusPublished")
      : product.status === "archived"
        ? t("statusArchived")
        : t("statusDraft")

  return (
    <div className="relative flex flex-col gap-4 border border-border bg-card p-3 sm:flex-row sm:p-4">
      <StitchedSeam />

      <Link href={productHref} className="relative aspect-square w-full shrink-0 overflow-hidden bg-secondary sm:size-40">
        {media && (
          <Image
            src={media.enhancedUrl ?? media.url}
            alt={title}
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            className="object-cover"
          />
        )}
        <Badge variant={statusVariant} className="absolute top-2 left-2">
          {statusLabel}
        </Badge>
        <div className="absolute right-2 bottom-2 left-2 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <span className="flex items-center gap-1" title={t("views")}>
            <Eye className="size-3" />
            {product.viewCount}
          </span>
          <span className="flex items-center gap-1" title={t("likes")}>
            <Heart className="size-3" />
            {product.likeCount}
          </span>
          <span className="flex items-center gap-1" title={t("inquiries")}>
            <MessageSquare className="size-3" />
            {inquiryCount}
          </span>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <Link href={productHref} className="font-heading text-base font-semibold text-foreground hover:text-primary sm:text-lg">
            {title}
          </Link>
          <p className="text-xs text-primary">{product.business.displayName}</p>
        </div>

        <p className="text-sm font-medium text-foreground">{formatPriceRange(product.priceMin, product.priceMax)}</p>

        {product.seoKeywords && product.seoKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.seoKeywords.map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {product.descriptionEn && <p className="line-clamp-2 text-sm text-muted-foreground">{product.descriptionEn}</p>}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link
            href={`/sell/products/${product.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Pencil className="size-3.5" />
            {tCommon("edit")}
          </Link>
          <ShareButton url={productHref} title={title} />
        </div>
      </div>
    </div>
  )
}
