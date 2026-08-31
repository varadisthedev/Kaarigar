import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { ShoppingBag, ChevronRight } from "lucide-react"

import { getCurrentUser } from "@/infra/http/current-user"
import { findUserById } from "@/infra/db/repositories/users.repository"
import { AvatarManager } from "@/components/account/avatar-manager"
import { LogoutButton } from "@/components/account/logout-button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Link } from "@/i18n/navigation"

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("account")

  const session = await getCurrentUser()
  if (!session) redirect(`/${locale}/login`)

  const user = await findUserById(session.sub)
  if (!user) redirect(`/${locale}/login`)
  const tOrders = await getTranslations("orders")

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>

      <Link href="/orders">
        <Card className="transition-colors hover:border-foreground/20">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <span className="flex items-center gap-3 text-sm font-medium text-foreground">
              <ShoppingBag className="size-4.5 text-muted-foreground" />
              {tOrders("title")}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <AvatarManager initialUrl={user.avatarUrl} name={user.name} />
          <Separator />
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("name")}</dt>
              <dd className="text-foreground">{user.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("phone")}</dt>
              <dd className="text-foreground">{user.phoneE164 ?? "—"}</dd>
            </div>
            {user.email && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("email")}</dt>
                <dd className="text-foreground">{user.email}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("locale")}</dt>
              <dd className="text-foreground">{user.locale === "hi" ? "हिन्दी" : "English"}</dd>
            </div>
          </dl>
          <Separator />
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  )
}
