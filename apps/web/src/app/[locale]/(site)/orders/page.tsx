import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findOrdersForBuyer } from "@/infra/db/repositories/orders.repository"
import { OrderCard } from "@/components/orders/order-card"

export default async function BuyerOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("orders")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const orders = await findOrdersForBuyer(user.sub)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8">
      <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>

      {orders.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("noOrdersYet")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} counterpartyLabel={order.business.displayName} />
          ))}
        </div>
      )}
    </div>
  )
}
