/**
 * Static site-chrome imagery (hero, empty states, category tiles) — NOT
 * per-business/product photos, which are real per-record data living in
 * `business_media`/`product_media`, not this registry.
 *
 * Swapping Unsplash for your own photography or an SVG later is editing one
 * entry here — no component changes, since every consumer reads through
 * `<Media assetKey="..."/>` rather than hardcoding a URL.
 */
export type MediaAsset = {
  src: string
  altEn: string
  altHi: string
  aspect?: `${number}/${number}`
  credit?: string
}

export const mediaAssets = {
  homeHero: {
    src: "https://images.unsplash.com/photo-1622037022824-0c71d511ad76?w=2000&q=80",
    altEn: "An Indian artisan at work",
    altHi: "काम करता हुआ एक भारतीय कारीगर",
    aspect: "16/9",
    credit: "Unsplash",
  },
} satisfies Record<string, MediaAsset>

export type MediaAssetKey = keyof typeof mediaAssets
