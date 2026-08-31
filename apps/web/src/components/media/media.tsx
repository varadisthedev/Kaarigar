import Image, { type ImageProps } from "next/image"

import { mediaAssets, type MediaAssetKey } from "@/config/media"

type MediaProps = Omit<ImageProps, "src" | "alt"> & {
  assetKey: MediaAssetKey
  locale: "en" | "hi" | "mr"
}

/** Reads from the static asset registry (`config/media.ts`) instead of a
 * hardcoded URL — swapping Unsplash for real photography or an SVG later is
 * editing one registry entry, not hunting through components. */
export function Media({ assetKey, locale, ...imageProps }: MediaProps) {
  const asset = mediaAssets[assetKey]
  return <Image src={asset.src} alt={locale === "hi" ? asset.altHi : asset.altEn} {...imageProps} />
}
