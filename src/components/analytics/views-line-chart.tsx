"use client"

import * as React from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useTranslations } from "next-intl"

import type { DailyViewByProduct, DailyViewTotal } from "@/infra/db/repositories/analytics.repository"

function formatDay(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function CustomTooltip({
  active,
  label,
  payload,
  byProductByDate,
}: {
  active?: boolean
  label?: string
  payload?: { value: number }[]
  byProductByDate: Map<string, { productTitle: string; views: number }[]>
}) {
  if (!active || !label) return null
  const breakdown = byProductByDate.get(label) ?? []
  const total = payload?.[0]?.value ?? 0

  return (
    <div className="rounded-none border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
      <p className="mb-1 font-medium">
        {formatDay(label)} — {total} views
      </p>
      {breakdown.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-muted-foreground">
          {breakdown.map((b) => (
            <li key={b.productTitle}>
              {b.productTitle}: {b.views}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ViewsLineChart({ daily, byProduct }: { daily: DailyViewTotal[]; byProduct: DailyViewByProduct[] }) {
  const t = useTranslations("analytics")

  const byProductByDate = React.useMemo(() => {
    const map = new Map<string, { productTitle: string; views: number }[]>()
    for (const row of byProduct) {
      const list = map.get(row.date) ?? []
      list.push({ productTitle: row.productTitle, views: row.views })
      map.set(row.date, list)
    }
    return map
  }, [byProduct])

  if (daily.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("noViewsYet")}</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip byProductByDate={byProductByDate} />} />
        <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
