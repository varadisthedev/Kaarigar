import { redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { listInquiriesForUser } from "@/infra/db/repositories/inquiries.repository"
import { Link } from "@/i18n/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const STATUS_VARIANT = {
  open: "warning",
  accepted: "success",
  declined: "destructive",
  closed: "secondary",
} as const

export default async function InquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("nav")
  const tInquiry = await getTranslations("inquiry")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const inquiries = await listInquiriesForUser(user.sub)

  const statusLabel = (status: (typeof inquiries)[number]["status"]) =>
    status === "open"
      ? tInquiry("statusOpen")
      : status === "accepted"
        ? tInquiry("statusAccepted")
        : status === "declined"
          ? tInquiry("statusDeclined")
          : status

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8">
      <h1 className="font-heading text-2xl font-medium text-foreground">{t("chats")}</h1>

      {inquiries.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No inquiries yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {inquiries.map((inquiry) => (
            <Link key={inquiry.id} href={`/inquiries/${inquiry.id}`}>
              <Card className="transition-colors hover:border-foreground/20">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium text-foreground">{inquiry.business.displayName}</p>
                    <p className="text-xs text-muted-foreground">{inquiry.message}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[inquiry.status]}>{statusLabel(inquiry.status)}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
