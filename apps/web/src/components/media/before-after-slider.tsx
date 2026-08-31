"use client"

import * as React from "react"

/** Drag (or tap) to reveal the enhanced image over the original — the "AI
 * Image Studio" comparison view. Built on pointer events + clip-path
 * rather than a library, since this is the only place in the app that
 * needs it. */
export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [percent, setPercent] = React.useState(50)
  const dragging = React.useRef(false)

  function updateFromClientX(clientX: number) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const next = ((clientX - rect.left) / rect.width) * 100
    setPercent(Math.min(100, Math.max(0, next)))
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full touch-none overflow-hidden rounded-md border border-border bg-secondary select-none"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        updateFromClientX(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && updateFromClientX(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={afterLabel} className="pointer-events-none absolute inset-0 size-full object-cover" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt={beforeLabel}
        className="pointer-events-none absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        draggable={false}
      />

      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${percent}%` }}>
        <div className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow">
          <div className="flex gap-0.5">
            <div className="h-3 w-0.5 bg-foreground/60" />
            <div className="h-3 w-0.5 bg-foreground/60" />
          </div>
        </div>
      </div>

      <span className="pointer-events-none absolute top-2 left-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
        {afterLabel}
      </span>
    </div>
  )
}
