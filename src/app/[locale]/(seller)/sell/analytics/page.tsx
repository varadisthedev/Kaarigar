import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"
import {
  getDailyViewsForSeller,
  getDailyViewsByProductForSeller,
  getMonthlyPaymentSummaryForSeller,
  getMonthlyIncomeTarget,
} from "@/infra/db/repositories/analytics.repository"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ViewsLineChart } from "@/components/analytics/views-line-chart"
import { IncomeSection } from "@/components/analytics/income-target-editor"

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("analytics")
  const tNav = await getTranslations("nav")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const businesses = await findBusinessesByOwner(user.sub)
  const primaryBusiness = businesses.find((b) => b.status === "approved") ?? businesses[0]

  const [daily, byProduct, incomeSummary, target] = await Promise.all([
    getDailyViewsForSeller(user.sub),
    getDailyViewsByProductForSeller(user.sub),
    getMonthlyPaymentSummaryForSeller(user.sub),
    primaryBusiness ? getMonthlyIncomeTarget(primaryBusiness.id) : Promise.resolve(null),
  ])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{tNav("analytics")}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("viewsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ViewsLineChart daily={daily} byProduct={byProduct} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("incomeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeSection
              initialTarget={target}
              advanceReceived={incomeSummary.advanceReceived}
              remainingOrderValue={incomeSummary.remainingOrderValue}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
