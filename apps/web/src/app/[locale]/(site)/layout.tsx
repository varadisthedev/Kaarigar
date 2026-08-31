import { getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { SellerHeader } from "@/components/layout/seller-header"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser()
  const user = session ? await findUserById(session.sub) : null
  const t = await getTranslations("common")
  const tNav = await getTranslations("nav")

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SellerHeader
        user={session}
        name={user?.name ?? null}
        avatarUrl={user?.avatarUrl ?? null}
        tagline={t("tagline")}
        loginLabel={tNav("login")}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <MobileTabBar isAuthenticated={Boolean(session)} />
    </div>
  )
}
