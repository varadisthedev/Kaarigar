import { redirect } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { getCurrentUser } from "@/infra/http/current-user"
import { findBusinessesByOwner } from "@/infra/db/repositories/business.repository"

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login?next=/${locale}/onboard`)

  const businesses = await findBusinessesByOwner(user.sub)
  if (businesses.length > 0) redirect(`/${locale}/sell/add`)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-6 px-4 py-8 sm:py-12">
      <OnboardingFlow />
    </div>
  )
}
