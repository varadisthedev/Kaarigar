"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/** Wraps a horizontally-scrolling row (category chips, product cards) with
 * left/right nav buttons — desktop users get click-to-scroll instead of
 * only trackpad/touch drag. Buttons hide themselves at each scroll edge and
 * on touch-only viewports, where the row is already swipeable. */
export function HorizontalScroller({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const updateEdges = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  React.useEffect(() => {
    updateEdges()
    const el = ref.current
    if (!el) return
    const onResize = () => updateEdges()
    window.addEventListener("resize", onResize)
    const observer = new ResizeObserver(updateEdges)
    observer.observe(el)
    return () => {
      window.removeEventListener("resize", onResize)
      observer.disconnect()
    }
  }, [updateEdges])

  function scrollBy(direction: 1 | -1) {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" })
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={updateEdges}
        className={cn("flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none]", className)}
      >
        {children}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute top-1/2 left-0 hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:border-primary/40 sm:flex"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute top-1/2 right-0 hidden size-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:border-primary/40 sm:flex"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}
