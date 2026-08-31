"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { useTranslations } from "next-intl"

import { formatInr } from "@/lib/format"

export function IncomePieChart({
  advanceReceived,
  remainingOrderValue,
}: {
  advanceReceived: number
  remainingOrderValue: number
}) {
  const t = useTranslations("analytics")
  const total = advanceReceived + remainingOrderValue

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("noEarningsYet")}</p>
  }

  const data = [
    { name: t("advanceReceived"), value: advanceReceived, color: "var(--success)" },
    { name: t("remainingOrderValue"), value: remainingOrderValue, color: "var(--muted-foreground)" },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatInr(Number(value ?? 0)), String(name)]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 0,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
