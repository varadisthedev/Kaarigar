import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findOrdersForSeller } from "@/infra/db/repositories/orders.repository"
import { OrderCard } from "@/components/orders/order-card"

export default async function SellerOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("orders")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const orders = await findOrdersForSeller(user.sub)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{t("title")}</h1>

      {orders.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("noOrdersYet")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              counterpartyLabel={order.buyer.name ?? order.buyer.phoneE164 ?? order.buyer.email ?? "Buyer"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
