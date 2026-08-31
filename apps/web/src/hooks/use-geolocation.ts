"use client"

import * as React from "react"

type Status = "idle" | "locating" | "done" | "error"

export function useGeolocation() {
  const [status, setStatus] = React.useState<Status>("idle")
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(null)
  const [error, setError] = React.useState<"unsupported" | "denied" | "unavailable" | null>(null)

  /** Resolves with the coordinates on success, `null` on denial/failure —
   * awaitable so callers can drive follow-up work (like a geocode fetch)
   * from the same user-initiated handler instead of an effect. */
  const request = React.useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    if (!("geolocation" in navigator)) {
      setStatus("error")
      setError("unsupported")
      return Promise.resolve(null)
    }
    setStatus("locating")
    setError(null)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }
          setCoords(next)
          setStatus("done")
          resolve(next)
        },
        (err) => {
          setStatus("error")
          setError(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
      )
    })
  }, [])

  return { status, coords, error, request }
}
