import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { SellerHeader } from "@/components/layout/seller-header"
import { SellerTabBar } from "@/components/layout/seller-tab-bar"

export default async function SellerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getCurrentUser()
  if (!session) redirect(`/${locale}/login`)

  const user = await findUserById(session.sub)
  if (!user) redirect(`/${locale}/login`)

  const t = await getTranslations("common")
  const tNav = await getTranslations("nav")

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SellerHeader
        user={session}
        name={user.name}
        avatarUrl={user.avatarUrl}
        tagline={t("tagline")}
        loginLabel={tNav("login")}
      />
      <main className="flex-1 pb-20">{children}</main>
      <SellerTabBar />
    </div>
  )
}
