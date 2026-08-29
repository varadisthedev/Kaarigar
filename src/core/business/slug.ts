import { slugExists } from "@/infra/db/repositories/business.repository"

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 180)
}

/** Appends a short random suffix only if the base slug is already taken —
 * keeps URLs clean in the common case. */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "product"
  if (!(await slugExists(base))) return base

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
    if (!(await slugExists(candidate))) return candidate
  }
  return `${base}-${Date.now()}`
}
