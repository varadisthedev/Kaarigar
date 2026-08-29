import Image from "next/image"
import { setRequestLocale, getTranslations } from "next-intl/server"

import { listPendingReviewBusinesses } from "@/infra/db/repositories/business.repository"
import { findVoiceSessionsByBusinessId } from "@/infra/db/repositories/voice.repository"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ReviewActions } from "@/components/admin/review-actions"

export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")

  // Role gating for this page happens in proxy.ts (redirects non-admins to
  // /login); this route is reached only after that check passes.
  const businesses = await listPendingReviewBusinesses()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {businesses.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("noPending")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {await Promise.all(
            businesses.map(async (business) => {
              const voiceSessions = await findVoiceSessionsByBusinessId(business.id)
              return (
                <Card key={business.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>{business.displayName}</CardTitle>
                      <Badge variant="warning">{business.craftCategory}</Badge>
                    </div>
                    <CardDescription>
                      {business.district}, {business.state} · {business.yearsExperience ?? "?"} yrs experience ·{" "}
                      {business.monthlyCapacity ?? "capacity unknown"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {business.descriptionEn && <p className="text-sm text-foreground">{business.descriptionEn}</p>}

                    {business.media.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("photos")}</p>
                        <div className="flex gap-2">
                          {business.media.map((m) => (
                            <div key={m.id} className="relative size-20 overflow-hidden bg-secondary">
                              <Image src={m.url} alt="" fill sizes="80px" className="object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {voiceSessions.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">{t("transcript")}</p>
                        {voiceSessions.map((v) => (
                          <p key={v.id} className="text-sm text-muted-foreground italic">
                            {`“${v.transcriptRaw}” — via ${v.provider}`}
                          </p>
                        ))}
                      </div>
                    )}

                    <ReviewActions businessId={business.id} />
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
