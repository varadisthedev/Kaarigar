import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findOrdersForSeller } from "@/infra/db/repositories/orders.repository"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatInr } from "@/lib/format"

const STATUS_VARIANT = {
  pending_advance: "warning",
  advance_paid: "success",
  in_production: "success",
  completed: "success",
  cancelled: "destructive",
} as const

export default async function SellerOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("nav")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const orders = await findOrdersForSeller(user.sub)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{t("orders")}</h1>

      {orders.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-foreground">
                    {order.buyer.name ?? order.buyer.phoneE164 ?? order.buyer.email ?? "Buyer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total {formatInr(order.totalAmount)} · Advance {formatInr(order.advanceAmount)} ({order.advancePercent}%)
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[order.status]}>{order.status.replace("_", " ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
