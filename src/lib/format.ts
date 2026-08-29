const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

export function formatInr(amount: number | string): string {
  return inrFormatter.format(Number(amount))
}

export function formatPriceRange(min: number | string | null, max: number | string | null): string {
  if (min == null && max == null) return "—"
  if (min != null && max != null) return `${formatInr(min)} – ${formatInr(max)}`
  return formatInr(min ?? max!)
}
