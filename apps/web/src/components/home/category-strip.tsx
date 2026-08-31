import { Amphora, Shirt, Hammer, Gem, TreePine, Palette, LayoutGrid } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { craftCategories, getCategoryLabel } from "@/config/craft-categories"
import { HorizontalScroller } from "@/components/home/horizontal-scroller"

/** A curated subset of `craftCategories` — the same reference list the
 * marketplace filter and voice-extraction fallback use, so tapping a chip
 * here (`?category=<labelEn>`) lands on exactly the businesses tagged with
 * it. "More" links to the unfiltered marketplace for the rest. */
const FEATURED_CATEGORY_IDS = ["pottery", "handloom-weaving", "wooden-lacquerware", "jewelry", "bamboo-craft", "folk-painting"] as const

const CATEGORY_ICONS: Record<(typeof FEATURED_CATEGORY_IDS)[number], typeof Amphora> = {
  pottery: Amphora,
  "handloom-weaving": Shirt,
  "wooden-lacquerware": Hammer,
  jewelry: Gem,
  "bamboo-craft": TreePine,
  "folk-painting": Palette,
}

export function CategoryStrip({
  locale,
  title,
  seeAll,
  more,
}: {
  locale: string
  title: string
  seeAll: string
  more: string
}) {
  const chips = FEATURED_CATEGORY_IDS.map((id) => craftCategories.find((c) => c.id === id)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-medium text-foreground">{title}</h2>
        <Link href="/marketplace" className="text-sm text-primary hover:underline">
          {seeAll}
        </Link>
      </div>

      <HorizontalScroller>
        {chips.map((category) => {
          const Icon = CATEGORY_ICONS[category.id as (typeof FEATURED_CATEGORY_IDS)[number]]
          const label = getCategoryLabel(category, locale)
          return (
            <Link
              key={category.id}
              href={`/marketplace?category=${encodeURIComponent(category.labelEn)}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-4 pl-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-3.5" />
              </span>
              {label}
            </Link>
          )
        })}

        <Link
          href="/marketplace"
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-4 pl-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/70">
            <LayoutGrid className="size-3.5" />
          </span>
          {more}
        </Link>
      </HorizontalScroller>
    </div>
  )
}
