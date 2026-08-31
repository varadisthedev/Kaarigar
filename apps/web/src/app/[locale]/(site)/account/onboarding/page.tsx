import { redirect } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { UserOnboardingForm } from "@/components/account/user-onboarding-form"

export default async function AccountOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
}) {
  const { locale } = await params
  const { redirect: redirectUrl } = await searchParams
  setRequestLocale(locale)

  const session = await getCurrentUser()
  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/account/onboarding`)
  }

  const user = await findUserById(session.sub)
  if (user?.profileCompletedAt) {
    redirect(redirectUrl || `/${locale}`)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-10rem)] w-full items-center justify-center px-4 py-10 sm:py-16">
      <UserOnboardingForm
        initialName={user?.name ?? ""}
        initialAvatarUrl={user?.avatarUrl ?? ""}
        redirectUrl={redirectUrl || `/${locale}`}
      />
    </div>
  )
}
