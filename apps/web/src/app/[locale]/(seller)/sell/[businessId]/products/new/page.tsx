import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { findBusinessById } from "@/infra/db/repositories/business.repository"
import { getCurrentUser } from "@/infra/http/current-user"
import { NewProductFlow } from "@/components/onboarding/new-product-flow"

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string; businessId: string }>
}) {
  const { locale, businessId } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  if (!user) notFound()

  const business = await findBusinessById(businessId)
  if (!business || business.ownerId !== user.sub || business.status !== "approved") notFound()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-6 px-4 py-8 sm:py-12">
      <NewProductFlow
        businessId={business.id}
        craftCategory={business.craftCategory}
        state={business.state ?? undefined}
      />
    </div>
  )
}
