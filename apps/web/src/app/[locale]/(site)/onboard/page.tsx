import { setRequestLocale } from "next-intl/server"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-6 px-4 py-8 sm:py-12">
      <OnboardingFlow />
    </div>
  )
}
