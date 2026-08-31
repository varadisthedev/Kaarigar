"use client"

import * as React from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import { useWebSpeech, isWebSpeechSupported } from "@/hooks/use-web-speech"
import type { BusinessDraft, ProductDraft } from "@/core/business/draft"

type Status = "idle" | "recording" | "processing" | "error"

export function MicButton<TDraft extends BusinessDraft | ProductDraft>({
  draftId,
  locale,
  purpose,
  hasServerSpeech,
  onResult,
}: {
  draftId: string
  locale: "en" | "hi"
  purpose: "business_onboarding" | "product_catalog"
  hasServerSpeech: boolean
  onResult: (result: { transcript: string; draft: TDraft }) => void
}) {
  const t = useTranslations("onboarding")
  const [status, setStatus] = React.useState<Status>("idle")
  const recorder = useVoiceRecorder()
  const webSpeech = useWebSpeech(locale)
  const useWebSpeechMode = !hasServerSpeech && isWebSpeechSupported()

  async function handleServerModeStop() {
    setStatus("processing")
    try {
      const blob = await recorder.stop()
      const form = new FormData()
      form.append("audio", blob, "audio.webm")
      form.append("draftId", draftId)
      form.append("purpose", purpose)
      form.append("languageHint", locale === "hi" ? "hi-IN" : "en-IN")

      const res = await apiFetch("/api/onboarding/voice/transcribe", { method: "POST", body: form })
      const data = await res.json()

      if (!data.ok) {
        setStatus("error")
        return
      }
      onResult({ transcript: data.transcript, draft: data.draft })
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  async function handleWebSpeechStop() {
    setStatus("processing")
    webSpeech.stop()
  }

  // Web Speech resolves asynchronously via its `start()` promise; wire the
  // result through once it settles.
  const webSpeechPromiseRef = React.useRef<Promise<string> | null>(null)

  async function handleClick() {
    if (status === "processing") return

    if (status === "idle") {
      setStatus("recording")
      if (useWebSpeechMode) {
        webSpeechPromiseRef.current = webSpeech.start()
        webSpeechPromiseRef.current
          .then(async (transcript) => {
            if (!transcript) {
              setStatus("error")
              return
            }
            const res = await apiFetch("/api/onboarding/voice/client-transcript", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ draftId, purpose, transcript, language: locale }),
            })
            const data = await res.json()
            if (!data.ok) {
              setStatus("error")
              return
            }
            onResult({ transcript, draft: data.draft })
            setStatus("idle")
          })
          .catch(() => setStatus("error"))
      } else {
        await recorder.start()
      }
      return
    }

    if (status === "recording") {
      if (useWebSpeechMode) {
        await handleWebSpeechStop()
      } else {
        await handleServerModeStop()
      }
    }
  }

  const isRecording = status === "recording"
  const isProcessing = status === "processing"

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          "flex size-24 items-center justify-center rounded-full border-2 transition-colors",
          isRecording
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background text-foreground hover:border-primary/50",
          isProcessing && "opacity-60"
        )}
        aria-pressed={isRecording}
      >
        {isProcessing ? (
          <Loader2 className="size-8 animate-spin" />
        ) : isRecording ? (
          <Square className="size-7" />
        ) : (
          <Mic className="size-8" />
        )}
      </button>
      <p className="text-sm text-muted-foreground">
        {isProcessing
          ? t("micProcessing")
          : isRecording
            ? webSpeech.interimTranscript || t("micRecording")
            : t("micIdle")}
      </p>
      {status === "error" && <p className="text-sm text-destructive">{t("micError")}</p>}
    </div>
  )
}
