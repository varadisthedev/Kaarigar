import Image from "next/image"
import { Check, MapPin } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatInr } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Order, Business, Payment, Inquiry, Product, ProductMedia } from "@/infra/db/schema"

type OrderWithDetails = Order & {
  business: Business
  payments: Payment[]
  inquiry: (Inquiry & { product: (Product & { media: ProductMedia[] }) | null }) | null
}

const STATUS_VARIANT = {
  pending_advance: "warning",
  advance_paid: "success",
  in_production: "success",
  completed: "success",
  cancelled: "destructive",
} as const

const TIMELINE_STEPS = ["pending_advance", "advance_paid", "in_production", "completed"] as const

export async function OrderCard({ order, counterpartyLabel }: { order: OrderWithDetails; counterpartyLabel: string }) {
  const t = await getTranslations("orders")

  const statusLabel = t(`status_${order.status}` as `status_${(typeof TIMELINE_STEPS)[number] | "cancelled"}`)
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status as (typeof TIMELINE_STEPS)[number])
  const media = order.inquiry?.product?.media.find((m) => m.isPrimary) ?? order.inquiry?.product?.media[0]
  const location = [order.business.district, order.business.state].filter(Boolean).join(", ")

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {order.inquiry?.product && (
              <div className="relative size-14 shrink-0 overflow-hidden bg-secondary">
                {media && (
                  <Image src={media.enhancedUrl ?? media.url} alt={order.inquiry.product.titleEn} fill sizes="56px" className="object-cover" />
                )}
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{order.inquiry?.product?.titleEn ?? counterpartyLabel}</p>
              <p className="text-xs text-muted-foreground">{counterpartyLabel}</p>
              {location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {location}
                </p>
              )}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[order.status]}>{statusLabel}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("total")} {formatInr(order.totalAmount)} · {t("advance")} {formatInr(order.advanceAmount)} ({order.advancePercent}%)
        </p>

        {order.status !== "cancelled" && (
          <ol className="flex items-center gap-1">
            {TIMELINE_STEPS.map((step, i) => (
              <li key={step} className="flex flex-1 items-center gap-1">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    i <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {i < currentStepIndex ? <Check className="size-3" /> : i + 1}
                </span>
                {i < TIMELINE_STEPS.length - 1 && (
                  <span className={cn("h-px flex-1", i < currentStepIndex ? "bg-primary" : "bg-border")} />
                )}
              </li>
            ))}
          </ol>
        )}
        {order.status !== "cancelled" && (
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {TIMELINE_STEPS.map((step) => (
              <span key={step} className="flex-1 text-center first:text-left last:text-right">
                {t(`status_${step}`)}
              </span>
            ))}
          </div>
        )}

        {order.payments.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("advancePayment")}</span>
                <span>
                  {formatInr(p.amount)} · {t(`paymentStatus_${p.status}` as `paymentStatus_${Payment["status"]}`)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
