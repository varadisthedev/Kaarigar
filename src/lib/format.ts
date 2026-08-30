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

/** Indian numbering (K/L/Cr) for real platform stats — a "+" suffix is
 * only ever appended to a genuine positive count, never fabricated. */
export function formatCompactCount(n: number): string {
  const value = n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n)
  return n > 0 ? `${value}+` : value
}

export function formatCompactInr(amount: number): string {
  if (amount <= 0) return formatInr(0)
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1).replace(/\.0$/, "")}Cr+`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1).replace(/\.0$/, "")}L+`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}K+`
  return `${formatInr(amount)}+`
}
