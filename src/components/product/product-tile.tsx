"use client"

import * as React from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { ChevronDown, Loader2, MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-fetch"
import { formatInr, formatPriceRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useInView } from "@/hooks/use-in-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Product, ProductMedia } from "@/infra/db/schema"

// Leaflet touches `window` at module load, so the map can only ever render
// client-side — dynamic+ssr:false here, on top of the lazy-mount-on-scroll
// in useInView below, so a grid of many tiles doesn't load many maps at once.
const ApproxLocationMap = dynamic(() => import("./approx-location-map").then((m) => m.ApproxLocationMap), {
  ssr: false,
})

type ProductWithMedia = Product & { media: ProductMedia[] }

export function ProductTile({
  product,
  businessId,
  currentUserId,
  approxLocation,
  locale,
}: {
  product: ProductWithMedia
  businessId: string
  currentUserId: string | null
  approxLocation?: { lat: number; lng: number }
  locale: "en" | "hi"
}) {
  const t = useTranslations("inquiry")
  const [mapRef, mapInView] = useInView<HTMLDivElement>()
  const [offerOpen, setOfferOpen] = React.useState(false)
  const [quantity, setQuantity] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [inquiryId, setInquiryId] = React.useState<string | null>(null)

  const media = product.media.find((m) => m.isPrimary) ?? product.media[0]
  const title = locale === "hi" ? (product.titleHi ?? product.titleEn) : product.titleEn

  const qtyNum = Number(quantity)
  const priceNum = Number(price)
  const total = quantity && price && qtyNum > 0 && priceNum > 0 ? qtyNum * priceNum : null

  async function sendOffer() {
    if (!quantity || !price) return
    setPending(true)
    try {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          productId: product.id,
          quantity: qtyNum,
          targetPrice: priceNum,
          message: `Interested in ${quantity} units at ${formatInr(priceNum)} each.`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInquiryId(data.inquiry.id)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col border border-border bg-card transition-colors hover:border-foreground/20">
      <Link href={`/product/${product.slug}`} className="group flex flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-secondary">
          {media && (
            <Image
              src={media.enhancedUrl ?? media.url}
              alt={title}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover transition-transform group-hover:scale-[1.02]"
            />
          )}
        </div>
        <div className="flex flex-col gap-1 p-3 pb-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{formatPriceRange(product.priceMin, product.priceMax)}</p>
        </div>
      </Link>

      {approxLocation && (
        <div ref={mapRef} className="px-3 pb-2">
          {mapInView && <ApproxLocationMap lat={approxLocation.lat} lng={approxLocation.lng} />}
        </div>
      )}

      <div className="flex flex-col gap-2 px-3 pb-3">
        {inquiryId ? (
          <Link href={`/inquiries/${inquiryId}`} className={cn(buttonVariants({ size: "sm" }), "w-full")}>
            <MessageCircle className="size-3.5" />
            {t("contactSeller")}
          </Link>
        ) : !currentUserId ? (
          <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
            {t("makeOffer")}
          </Link>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setOfferOpen((v) => !v)} className="w-full">
              {t("makeOffer")}
              <ChevronDown className={cn("size-3.5 transition-transform", offerOpen && "rotate-180")} />
            </Button>
            {offerOpen && (
              <div className="flex flex-col gap-2 border-t border-border pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`qty-${product.id}`} className="text-[11px]">
                      {t("quantity")}
                    </Label>
                    <Input
                      id={`qty-${product.id}`}
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`price-${product.id}`} className="text-[11px]">
                      {t("yourPrice")}
                    </Label>
                    <Input
                      id={`price-${product.id}`}
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {total != null && (
                  <p className="text-xs text-muted-foreground">
                    {quantity} × {formatInr(priceNum)} = <span className="font-semibold text-primary">{formatInr(total)}</span>
                  </p>
                )}
                <Button size="sm" onClick={sendOffer} disabled={pending || !quantity || !price} className="w-full">
                  {pending && <Loader2 className="size-3.5 animate-spin" />}
                  {t("send")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
