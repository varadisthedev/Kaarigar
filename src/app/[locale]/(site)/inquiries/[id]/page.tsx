import { notFound, redirect } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findInquiryById } from "@/infra/db/repositories/inquiries.repository"
import { Link } from "@/i18n/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ChatThread } from "@/components/messaging/chat-thread"
import { PayAdvanceDialog } from "@/components/payments/pay-advance-dialog"

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations("inquiry")

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/login`)

  const inquiry = await findInquiryById(id)
  if (!inquiry) notFound()

  const isBuyer = inquiry.buyerId === user.sub
  const isSeller = inquiry.business.ownerId === user.sub
  if (!isBuyer && !isSeller) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href={`/business/${inquiry.business.businessCode ?? ""}`} className="text-sm text-muted-foreground hover:text-foreground">
        {inquiry.business.displayName}
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("chatTitle")}</CardTitle>
            {inquiry.product && <CardDescription>{inquiry.product.titleEn}</CardDescription>}
          </div>
          {isBuyer && <PayAdvanceDialog inquiryId={inquiry.id} />}
        </CardHeader>
        <CardContent>
          <ChatThread inquiryId={inquiry.id} currentUserId={user.sub} />
        </CardContent>
      </Card>
    </div>
  )
}
