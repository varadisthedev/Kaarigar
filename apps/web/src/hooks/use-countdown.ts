"use client"

import * as React from "react"

/** Simple second-granularity countdown, e.g. for an OTP resend cooldown. */
export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = React.useState(0)

  React.useEffect(() => {
    if (seconds <= 0) return
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds])

  const start = React.useCallback(() => setSeconds(initialSeconds), [initialSeconds])

  return { seconds, isActive: seconds > 0, start }
}
