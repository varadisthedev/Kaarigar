"use client"

import * as React from "react"
import { Pencil, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { formatInr } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { IncomePieChart } from "./income-pie-chart"

export function IncomeSection({
  initialTarget,
  advanceReceived,
  remainingOrderValue,
}: {
  initialTarget: number | null
  advanceReceived: number
  remainingOrderValue: number
}) {
  const t = useTranslations("analytics")
  const [target, setTarget] = React.useState(initialTarget)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(String(initialTarget ?? ""))
  const [pending, setPending] = React.useState(false)

  const actual = advanceReceived + remainingOrderValue
  const progressPct = target ? Math.min(100, (actual / target) * 100) : 0

  async function save() {
    const value = Number(draft)
    if (!value || value <= 0) return
    setPending(true)
    try {
      const res = await apiFetch("/api/analytics/income", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: value }),
      })
      if (res.ok) {
        setTarget(value)
        setEditing(false)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("targetPlaceholder")}
              className="max-w-40"
              disabled={pending}
            />
            <Button size="icon" variant="outline" onClick={save} disabled={pending} aria-label={t("saveTarget")}>
              <Check className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)} disabled={pending} aria-label={t("cancelTarget")}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(String(target ?? ""))
              setEditing(true)
            }}
            className="flex w-fit items-center gap-1.5 text-sm text-foreground hover:text-primary"
          >
            {target ? (
              <span>
                {formatInr(actual)} {t("ofTarget")} <span className="font-medium">{formatInr(target)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t("setTarget")}</span>
            )}
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
        )}

        {target && (
          <div className="h-2 w-full overflow-hidden bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      <IncomePieChart advanceReceived={advanceReceived} remainingOrderValue={remainingOrderValue} />

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "var(--success)" }} />
          {t("advanceReceived")}: {formatInr(advanceReceived)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "var(--muted-foreground)" }} />
          {t("remainingOrderValue")}: {formatInr(remainingOrderValue)}
        </span>
      </div>
    </div>
  )
}
