import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { PriceCheckForm } from "@/components/sell/price-check-form"

export default async function PriceCheckPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("sell")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="font-heading text-xl font-medium text-foreground">{t("checkPrice")}</h1>
      <PriceCheckForm />
    </div>
  )
}
