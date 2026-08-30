import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STATUS_VARIANT = {
  approved: "success",
  pending_review: "warning",
  rejected: "destructive",
  draft: "secondary",
  suspended: "destructive",
} as const

export default async function MyBusinessesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sell")

  const user = await getCurrentUser()
  const businesses = user ? await findBusinessesByOwner(user.sub) : []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/onboard" className={buttonVariants()}>
          {t("registerNew")}
        </Link>
      </div>

      {businesses.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("noBusinesses")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border">
          {businesses.map((business) => (
            <div key={business.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-foreground">{business.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {business.craftCategory} · {business.state}
                  {business.businessCode && ` · ${business.businessCode}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[business.status]}>
                  {business.status === "approved"
                    ? t("statusApproved")
                    : business.status === "pending_review"
                      ? t("statusPendingReview")
                      : business.status === "rejected"
                        ? t("statusRejected")
                        : business.status}
                </Badge>
                {business.status === "approved" && (
                  <Link
                    href={`/sell/${business.id}/products/new`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {t("addProduct")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
