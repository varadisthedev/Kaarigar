"use client"

import * as React from "react"
import { Phone } from "lucide-react"
import { useTranslations } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { Button } from "@/components/ui/button"

/** Phone numbers stay private until an inquiry is accepted — this fetches
 * the counterparty's number only at the moment of tapping, rather than ever
 * embedding it in the page (so it can't be scraped from page source). */
export function CallButton({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations("inquiry")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function call() {
    setPending(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/inquiries/${inquiryId}/phone`)
      const data = await res.json()
      if (res.ok) {
        window.location.href = `tel:${data.phoneE164}`
      } else if (data.error === "no_phone_on_file") {
        // An OAuth-only account (Google/GitHub) has no phone number —
        // a real, distinct outcome from "not accepted yet", not a dead click.
        setError(t("noPhoneOnFile"))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={call} disabled={pending}>
        <Phone className="size-3.5" />
        {t("call")}
      </Button>
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </div>
  )
}
