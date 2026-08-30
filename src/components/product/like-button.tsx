"use client"

import * as React from "react"
import { Heart } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export function LikeButton({
  productId,
  initialLiked,
  initialCount,
  currentUserId,
  variant = "pill",
}: {
  productId: string
  initialLiked: boolean
  initialCount: number
  currentUserId: string | null
  /** "pill" — bordered, shows the count (product detail page).
   * "icon" — plain circular heart overlay, no count (discovery cards). */
  variant?: "pill" | "icon"
}) {
  const [liked, setLiked] = React.useState(initialLiked)
  const [count, setCount] = React.useState(initialCount)
  const [pending, setPending] = React.useState(false)

  if (!currentUserId) {
    if (variant === "icon") {
      return (
        <Link
          href="/login"
          onClick={(e) => e.stopPropagation()}
          className="flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-foreground"
        >
          <Heart className="size-4" />
        </Link>
      )
    }
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Heart className="size-4" />
        {count}
      </Link>
    )
  }

  async function toggle(e?: React.MouseEvent) {
    e?.stopPropagation()
    e?.preventDefault()
    if (pending) return
    setPending(true)
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))
    try {
      const res = await apiFetch(`/api/products/${productId}/like`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        setCount(data.likeCount)
      } else {
        setLiked(!nextLiked)
        setCount((c) => c + (nextLiked ? -1 : 1))
      }
    } finally {
      setPending(false)
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={liked}
        className={cn(
          "flex size-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm transition-colors",
          liked ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Heart className={cn("size-4", liked && "fill-primary")} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className={cn(
        "flex items-center gap-1.5 border px-3 py-2 text-sm transition-colors",
        liked ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      <Heart className={cn("size-4", liked && "fill-primary")} />
      {count}
    </button>
  )
}
