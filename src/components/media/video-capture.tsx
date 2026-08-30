"use client"

import * as React from "react"
import { Circle, Square, Loader2, RotateCcw, Check } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { uploadToCloudinary } from "@/lib/cloudinary-upload"

const MAX_SECONDS = 10

// Ordered by preference: codecs known to also be immediately re-playable via
// a plain <video src> in the recording browser, not just recordable — an
// unplayable-but-recordable combination is what produces Chrome's "No video
// with supported format and MIME type found" placeholder on the preview.
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
]

function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

export type ReadyVideo = { url: string; publicId: string }

type Status = "idle" | "recording" | "preview" | "uploading" | "error"

export function VideoCapture({
  draftId,
  onChange,
}: {
  draftId: string
  onChange: (video: ReadyVideo | null) => void
}) {
  const t = useTranslations("onboarding")
  const [status, setStatus] = React.useState<Status>("idle")
  const [secondsLeft, setSecondsLeft] = React.useState(MAX_SECONDS)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  const liveVideoRef = React.useRef<HTMLVideoElement>(null)
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)
  const blobRef = React.useRef<Blob | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType })
        if (blob.size === 0) {
          setStatus("error")
          return
        }
        blobRef.current = blob
        setPreviewUrl(URL.createObjectURL(blob))
        setStatus("preview")
      }
      recorder.start(1000) // 1s timeslice — flushes chunks progressively instead of only at stop
      recorderRef.current = recorder
      setSecondsLeft(MAX_SECONDS)
      setStatus("recording")

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer()
            recorder.stop()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setStatus("error")
    }
  }

  function stopEarly() {
    clearTimer()
    recorderRef.current?.stop()
  }

  function retake() {
    clearTimer()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    blobRef.current = null
    setPreviewUrl(null)
    onChange(null)
    setStatus("idle")
  }

  async function useVideo() {
    if (!blobRef.current) return
    setStatus("uploading")
    try {
      const uploaded = await uploadToCloudinary(blobRef.current, "onboarding_video", draftId)
      onChange({ url: uploaded.url, publicId: uploaded.publicId })
      setStatus("preview")
    } catch {
      setStatus("error")
    }
  }

  React.useEffect(() => {
    return () => {
      clearTimer()
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === "preview" && previewUrl) {
    return (
      <div className="flex flex-col items-center gap-3">
        <video src={previewUrl} controls className="aspect-video w-full max-w-sm rounded-lg border border-border" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={retake}
            className="flex items-center gap-1.5 border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
          >
            <RotateCcw className="size-4" />
            {t("videoRetake")}
          </button>
          <button
            type="button"
            onClick={useVideo}
            className="flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Check className="size-4" />
            {t("videoUse")}
          </button>
        </div>
      </div>
    )
  }

  if (status === "recording") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-border bg-black">
          <video ref={liveVideoRef} autoPlay muted playsInline className="size-full object-cover" />
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-xs font-medium text-destructive-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            {secondsLeft}s
          </span>
        </div>
        <button
          type="button"
          onClick={stopEarly}
          className="flex items-center gap-1.5 border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
        >
          <Square className="size-3.5" />
          {t("videoStop")}
        </button>
        <p className="text-sm text-muted-foreground">{t("videoRecording")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={startRecording}
        disabled={status === "uploading"}
        className={cn(
          "flex size-24 items-center justify-center rounded-full border-2 border-border bg-background text-foreground transition-colors hover:border-primary/50",
          status === "uploading" && "opacity-60"
        )}
      >
        {status === "uploading" ? <Loader2 className="size-8 animate-spin" /> : <Circle className="size-8 fill-destructive text-destructive" />}
      </button>
      <p className="text-sm text-muted-foreground">{t("promptVideoIntro")}</p>
      {status === "error" && <p className="text-sm text-destructive">{t("micError")}</p>}
    </div>
  )
}
