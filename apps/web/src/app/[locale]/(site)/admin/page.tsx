import Image from "next/image"
import { ClipboardList } from "lucide-react"
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
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      {/* Desktop-only rail — the review queue is the only admin destination
          today, so the "nav" is a single, real, active item plus decorative
          bookends rather than a full sidebar of placeholder links. */}
      <aside className="hidden w-56 shrink-0 flex-col gap-4 lg:flex">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-primary/5">
          <Image
            src="/artisan-figure.png"
            alt=""
            fill
            sizes="224px"
            className="object-contain object-bottom p-4"
          />
        </div>

        <nav className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-2">
          <span className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
            <ClipboardList className="size-4.5" />
            {t("title")}
            {businesses.length > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                {businesses.length}
              </span>
            )}
          </span>
        </nav>

        <div className="relative mt-auto aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-primary/5">
          <Image src="/bottomleft.png" alt="" fill sizes="224px" className="object-cover" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-medium text-foreground">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
          {businesses.length > 0 && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary lg:hidden">
              {businesses.length}
            </span>
          )}
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
    </div>
  )
}
