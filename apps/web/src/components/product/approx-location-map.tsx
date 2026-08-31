"use client"

import * as React from "react"
import L from "leaflet"
import { MapContainer, TileLayer, Marker } from "react-leaflet"
import { Navigation } from "lucide-react"
import { useTranslations } from "next-intl"

// A small colored pin built from inline SVG instead of Leaflet's default
// marker images — those break under most bundlers unless you manually
// rewrite their asset paths, and a custom divIcon sidesteps that entirely.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="color: var(--primary)">
    <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" fill="currentColor" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg>`,
  iconSize: [26, 26],
  iconAnchor: [13, 24],
})

/** A static, non-interactive preview of an *approximate* location — never
 * pass real/exact coordinates here (see src/lib/geo-privacy.ts). Dragging,
 * zoom, and every other interaction are disabled on purpose: this is a
 * glanceable preview, not a real map to pan around, which also keeps tile
 * requests to a handful per card. */
export function ApproxLocationMap({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations("inquiry")
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-md border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        dragging={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        className="size-full"
      >
        {/* OpenStreetMap's usage policy requires this attribution to stay
         * visible — the directions button below is positioned to avoid
         * overlapping Leaflet's default bottom-right attribution control. */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={t("getDirections")}
        aria-label={t("getDirections")}
        className="absolute top-1.5 right-1.5 z-[1000] flex size-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm hover:text-primary"
      >
        <Navigation className="size-3.5" />
      </a>
    </div>
  )
}
