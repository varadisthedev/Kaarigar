import { notFound, redirect } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/infra/http/current-user"
import { findInquiryById } from "@/infra/db/repositories/inquiries.repository"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ChatThread } from "@/components/messaging/chat-thread"
import { PayAdvanceDialog } from "@/components/payments/pay-advance-dialog"
import { RespondActions } from "@/components/messaging/respond-actions"
import { CallButton } from "@/components/messaging/call-button"

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

  const statusLabel =
    inquiry.status === "open"
      ? t("statusOpen")
      : inquiry.status === "accepted"
        ? t("statusAccepted")
        : inquiry.status === "declined"
          ? t("statusDeclined")
          : inquiry.status

  // Buyers see the business they're inquiring with; sellers see the buyer
  // who reached out — same header layout, different subject.
  const headerName = isBuyer ? inquiry.business.displayName : (inquiry.buyer.name ?? t("you"))
  const headerAvatarUrl = isBuyer ? inquiry.business.logoUrl : inquiry.buyer.avatarUrl
  const headerSubtitle = isBuyer
    ? [inquiry.business.craftCategory, inquiry.business.state].filter(Boolean).join(" • ")
    : t("title")
  const otherPartyName = isBuyer ? inquiry.business.displayName : (inquiry.buyer.name ?? t("you"))
  const otherPartyAvatarUrl = isBuyer ? inquiry.business.logoUrl : inquiry.buyer.avatarUrl

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/inquiries"
            className="flex size-9 items-center justify-center border border-border text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Avatar className="size-11">
            {headerAvatarUrl && <AvatarImage src={headerAvatarUrl} alt={headerName} />}
            <AvatarFallback>{headerName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href={isBuyer ? `/business/${inquiry.business.businessCode ?? ""}` : "#"}
                className="font-heading text-base font-medium text-foreground hover:underline"
              >
                {headerName}
              </Link>
              {isBuyer && inquiry.business.status === "approved" && (
                <CheckCircle2 className="size-4 text-green-600" aria-label="Verified" />
              )}
            </div>
            {headerSubtitle && <p className="text-xs text-muted-foreground">{headerSubtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inquiry.status === "accepted" ? (
            <div className="flex items-center gap-2 border border-green-600/30 bg-green-600/10 px-3 py-1.5">
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              <div className="text-xs leading-tight">
                <p className="font-medium text-green-700 dark:text-green-500">{t("requestAccepted")}</p>
                <p className="text-muted-foreground">{t("requestAcceptedHint")}</p>
              </div>
            </div>
          ) : (
            <Badge variant={inquiry.status === "declined" ? "destructive" : "warning"}>{statusLabel}</Badge>
          )}
          {inquiry.status === "accepted" && <CallButton inquiryId={inquiry.id} />}
          {isBuyer && inquiry.status === "accepted" && <PayAdvanceDialog inquiryId={inquiry.id} />}
        </div>
      </div>

      {inquiry.product && (
        <p className="text-sm text-muted-foreground">
          {t("title")}: <span className="text-foreground">{inquiry.product.titleEn}</span>
        </p>
      )}

      {isSeller && inquiry.status === "open" && <RespondActions inquiryId={inquiry.id} />}

      <ChatThread
        inquiryId={inquiry.id}
        currentUserId={user.sub}
        otherPartyName={otherPartyName}
        otherPartyAvatarUrl={otherPartyAvatarUrl}
        canQuickAct={inquiry.status === "accepted"}
      />
    </div>
  )
}
