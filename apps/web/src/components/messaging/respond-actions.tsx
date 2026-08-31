"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

/** Seller-only accept/decline for an open inquiry — accepting is what
 * unlocks the direct-call action for both sides. */
export function RespondActions({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations("inquiry")
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function respond(decision: "accepted" | "declined") {
    setPending(true)
    try {
      const res = await apiFetch(`/api/inquiries/${inquiryId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      if (res.ok) router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => respond("accepted")} disabled={pending}>
        {t("accept")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => respond("declined")} disabled={pending}>
        {t("decline")}
      </Button>
    </div>
  )
}
