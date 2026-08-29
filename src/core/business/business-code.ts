/**
 * Pure domain logic — no DB, no framework. Produces the public, human-readable
 * business ID assigned on admin approval, e.g. "CM-MH-000123".
 *
 * Uniqueness is NOT guaranteed by this function alone: the 6-digit segment is
 * random, so callers that insert into the database must retry on a unique-
 * constraint collision (see `core/business/onboarding.service.ts`). With a
 * 900,000-value space this is a non-issue at MVP scale, but the contract is
 * "candidate code", not "guaranteed-unique code".
 */

const STATE_CODES: Record<string, string> = {
  "andhra pradesh": "AP",
  "arunachal pradesh": "AR",
  assam: "AS",
  bihar: "BR",
  chhattisgarh: "CG",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  "himachal pradesh": "HP",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  "madhya pradesh": "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OD",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  "tamil nadu": "TN",
  telangana: "TS",
  tripura: "TR",
  "uttar pradesh": "UP",
  uttarakhand: "UK",
  "west bengal": "WB",
  delhi: "DL",
  "jammu and kashmir": "JK",
  ladakh: "LA",
  chandigarh: "CH",
  puducherry: "PY",
}

/** Proper-cased state names, for keyword matching and form dropdowns. */
export const INDIAN_STATES = Object.keys(STATE_CODES).map((k) =>
  k.replace(/\b\w/g, (c) => c.toUpperCase())
)

export function stateCode(state: string | null | undefined): string {
  if (!state) return "IN"
  return STATE_CODES[state.trim().toLowerCase()] ?? "IN"
}

export function generateBusinessCode(state: string | null | undefined): string {
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")
  return `CM-${stateCode(state)}-${digits}`
}
