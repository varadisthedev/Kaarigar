"use client"

import * as React from "react"
import Image from "next/image"
import { Play } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProductMedia } from "@/infra/db/schema"

export function ProductGallery({ media, title }: { media: ProductMedia[]; title: string }) {
  const ordered = React.useMemo(() => {
    const primary = media.find((m) => m.isPrimary)
    if (!primary) return media
    return [primary, ...media.filter((m) => m.id !== primary.id)]
  }, [media])

  const [activeId, setActiveId] = React.useState(ordered[0]?.id)
  const active = ordered.find((m) => m.id === activeId) ?? ordered[0]

  if (!active) {
    return <div className="aspect-square w-full bg-secondary" />
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
        {active.mediaType === "video" ? (
          <video src={active.url} controls playsInline className="size-full object-cover" />
        ) : (
          <Image
            src={active.enhancedUrl ?? active.url}
            alt={title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      {ordered.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ordered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              aria-label={item.mediaType === "video" ? "Video" : "Photo"}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden border bg-secondary transition-colors",
                item.id === active.id ? "border-primary" : "border-border hover:border-foreground/30"
              )}
            >
              {item.mediaType === "video" ? (
                <video src={item.url} muted playsInline className="size-full object-cover" />
              ) : (
                <Image src={item.enhancedUrl ?? item.url} alt="" fill sizes="64px" className="object-cover" />
              )}
              {item.mediaType === "video" && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                  <Play className="size-4 fill-white text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
