import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"
import { Link } from "@/i18n/navigation"

/** The bottom-bar plus button lands here first — decides where "add" should
 * actually go: straight into Add Product when there's exactly one approved
 * business, a picker when there's more than one, or onboarding when there's
 * none yet. */
export default async function AddPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const businesses = await findBusinessesByOwner(user.sub)
  const approved = businesses.filter((b) => b.status === "approved")

  if (approved.length === 0) redirect(`/${locale}/onboard`)
  if (approved.length === 1) redirect(`/${locale}/sell/${approved[0].id}/products/new`)

  const t = await getTranslations("sell")

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{t("addProduct")}</h1>
      <p className="text-sm text-muted-foreground">Which business is this product for?</p>
      <div className="flex flex-col divide-y divide-border border border-border">
        {approved.map((b) => (
          <Link key={b.id} href={`/sell/${b.id}/products/new`} className="p-4 text-sm text-foreground hover:bg-secondary">
            {b.displayName}
          </Link>
        ))}
      </div>
    </div>
  )
}
