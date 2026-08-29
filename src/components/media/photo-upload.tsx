"use client"

import * as React from "react"
import { Camera, Loader2, Sparkles, Trash2, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { uploadToCloudinary, type UploadKind, type UploadedAsset } from "@/lib/cloudinary-upload"
import { removeImageBackground } from "@/lib/background-removal"
import { cloudinaryEnhancedUrl } from "@/core/media/cloudinary-transform"

type PhotoState = {
  id: string
  previewUrl: string
  status: "uploading" | "ready" | "removing_bg" | "error"
  uploaded?: UploadedAsset
  bgRemovedAsset?: UploadedAsset
  showEnhanced: boolean
  error?: string
}

export type ReadyPhoto = { url: string; publicId: string; enhancedUrl?: string }

export function PhotoUpload({
  kind,
  draftId,
  maxPhotos = 6,
  onChange,
}: {
  kind: UploadKind
  draftId?: string
  maxPhotos?: number
  onChange: (photos: ReadyPhoto[]) => void
}) {
  const t = useTranslations("onboarding")
  const [photos, setPhotos] = React.useState<PhotoState[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  const emitChange = React.useCallback((next: PhotoState[]) => {
    const ready: ReadyPhoto[] = next
      .filter((p) => p.status === "ready" && p.uploaded)
      .map((p) => ({
        url: p.uploaded!.url,
        publicId: p.uploaded!.publicId,
        enhancedUrl: p.bgRemovedAsset?.url ?? cloudinaryEnhancedUrl(p.uploaded!.cloudName, p.uploaded!.publicId),
      }))
    onChange(ready)
  }, [onChange])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const remaining = maxPhotos - photos.length
    const selected = Array.from(files).slice(0, remaining)

    const pending: PhotoState[] = selected.map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
      showEnhanced: true,
    }))

    setPhotos((prev) => {
      const next = [...prev, ...pending]
      emitChange(next)
      return next
    })

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      const photoId = pending[i].id
      try {
        const uploaded = await uploadToCloudinary(file, kind, draftId)
        setPhotos((prev) => {
          const next = prev.map((p) => (p.id === photoId ? { ...p, status: "ready" as const, uploaded } : p))
          emitChange(next)
          return next
        })
      } catch {
        setPhotos((prev) => {
          const next = prev.map((p) =>
            p.id === photoId ? { ...p, status: "error" as const, error: "upload_failed" } : p
          )
          emitChange(next)
          return next
        })
      }
    }
  }

  async function handleRemoveBackground(photo: PhotoState) {
    if (!photo.uploaded) return
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status: "removing_bg" } : p)))
    try {
      const original = await fetch(photo.uploaded.url).then((r) => r.blob())
      const cutout = await removeImageBackground(original)
      const bgRemovedAsset = await uploadToCloudinary(cutout, kind, draftId)
      setPhotos((prev) => {
        const next = prev.map((p) =>
          p.id === photo.id ? { ...p, status: "ready" as const, bgRemovedAsset, showEnhanced: true } : p
        )
        emitChange(next)
        return next
      })
    } catch {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status: "ready" as const } : p)))
    }
  }

  function toggleView(id: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, showEnhanced: !p.showEnhanced } : p)))
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id)
      emitChange(next)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => {
          const enhancedUrl = photo.uploaded
            ? photo.bgRemovedAsset?.url ?? cloudinaryEnhancedUrl(photo.uploaded.cloudName, photo.uploaded.publicId)
            : undefined
          const displaySrc = photo.showEnhanced && enhancedUrl ? enhancedUrl : photo.previewUrl

          return (
            <div key={photo.id} className="relative aspect-square overflow-hidden border border-border bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displaySrc} alt="" className="size-full object-cover" />

              {(photo.status === "uploading" || photo.status === "removing_bg") && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {photo.status === "ready" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/80 p-1">
                  <button
                    type="button"
                    onClick={() => toggleView(photo.id)}
                    className="px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                  >
                    {photo.showEnhanced ? t("photosAfter") : t("photosBefore")}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveBackground(photo)}
                      title={t("photosEnhance")}
                      className="p-1 text-muted-foreground hover:text-primary"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {photo.status === "error" && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 text-xs text-destructive"
                >
                  <X className="size-4" />
                  {t("photosAdd")}
                </button>
              )}
            </div>
          )
        })}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            )}
          >
            <Camera className="size-5" />
            <span className="text-xs">{t("photosAdd")}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
