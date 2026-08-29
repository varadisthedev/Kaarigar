import { getCurrentUser } from "@/infra/http/current-user"
import { SiteHeader } from "@/components/layout/site-header"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <MobileTabBar isAuthenticated={Boolean(user)} />
    </div>
  )
}
