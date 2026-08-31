"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"

import { apiFetch } from "@/lib/api-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ReviewActions({ businessId }: { businessId: string }) {
  const t = useTranslations("admin")
  const router = useRouter()
  const [rejecting, setRejecting] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [pending, setPending] = React.useState(false)

  async function approve() {
    setPending(true)
    try {
      const res = await apiFetch(`/api/admin/businesses/${businessId}/approve`, { method: "POST" })
      if (res.ok) router.refresh()
    } finally {
      setPending(false)
    }
  }

  async function reject() {
    if (!reason.trim()) return
    setPending(true)
    try {
      const res = await apiFetch(`/api/admin/businesses/${businessId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reasonLabel")}
          disabled={pending}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={reject} disabled={pending || !reason.trim()}>
            {t("reject")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={approve} disabled={pending}>
        {t("approve")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={pending}>
        {t("reject")}
      </Button>
    </div>
  )
}
