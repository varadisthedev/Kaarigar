"use client"

import * as React from "react"

/** True once the element has scrolled into view at least once — stays true
 * after that (doesn't re-hide on scrolling away). Used to defer mounting
 * something expensive (a Leaflet map instance, say) until it's actually
 * about to be seen. */
export function useInView<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T | null>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  return [ref, inView]
}
