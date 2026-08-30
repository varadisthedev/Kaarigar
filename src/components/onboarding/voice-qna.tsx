"use client"

import * as React from "react"
import { Mic, Loader2, Pencil, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import { useWebSpeech, isWebSpeechSupported } from "@/hooks/use-web-speech"
import type { BusinessDraft, ProductDraft } from "@/core/business/draft"
import type { PromptKey } from "@/core/onboarding/voice-script"
import { TalkingPrompt } from "./talking-prompt"
import { HighlightedTranscript } from "./highlighted-transcript"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type QnaField<TDraft> = {
  id: string
  promptKey: PromptKey
  label: string
  required: boolean
  getValue: (draft: Partial<TDraft>) => string | undefined
  setValue: (draft: Partial<TDraft>, value: string) => Partial<TDraft>
}

const SILENCE_STOP_MS = 1500

function hasValue(value: string | undefined): boolean {
  return value != null && value.trim().length > 0
}

type Phase = "asking" | "listening" | "processing" | "confirming"

const bubbleIn = "animate-in slide-in-from-bottom-2 fade-in duration-300"

/** A chat-style, one-question-at-a-time voice interview. The mic starts
 * listening on its own the moment a question appears — no tap required —
 * and auto-stops itself once the artisan pauses. Prefers the browser's live
 * SpeechRecognition (Web Speech API) whenever it's available, since it's
 * the only source that can stream partial results — that's what drives the
 * live-caption side panel, the word highlighting, and the silence-based
 * auto-stop. Falls back to the existing record-then-transcribe (Sarvam)
 * pipeline when Web Speech isn't supported, just without a live caption
 * (manual stop only, via the panel's Stop button). Either way, every voice
 * answer goes through a "did you mean this?" confirmation before it's
 * committed — typed answers and edits to past answers commit immediately,
 * since typing is already a deliberate, unambiguous action. */
export function VoiceQna<TDraft extends BusinessDraft | ProductDraft>({
  draftId,
  locale,
  purpose,
  fields,
  initialDraft,
  onComplete,
}: {
  draftId: string
  locale: "en" | "hi"
  purpose: "business_onboarding" | "product_catalog"
  fields: QnaField<TDraft>[]
  initialDraft?: Partial<TDraft>
  onComplete: (draft: Partial<TDraft>) => void
}) {
  const t = useTranslations("onboarding")
  const [draft, setDraft] = React.useState<Partial<TDraft>>(initialDraft ?? {})
  const [skippedIds, setSkippedIds] = React.useState<Set<string>>(new Set())
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [phase, setPhase] = React.useState<Phase>("asking")
  const [liveText, setLiveText] = React.useState("")
  const [pendingValue, setPendingValue] = React.useState("")
  const [promptNonce, setPromptNonce] = React.useState(0)
  const [micError, setMicError] = React.useState(false)

  const webSpeechSupported = isWebSpeechSupported()
  const liveTextRef = React.useRef("")
  const lastUpdateRef = React.useRef(0)
  const silenceTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = React.useRef(0)
  const autoStartKeyRef = React.useRef<string | null>(null)
  const typedRef = React.useRef<HTMLInputElement>(null)
  const editRef = React.useRef<HTMLInputElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const recorder = useVoiceRecorder()
  const handleSpeechUpdate = React.useCallback((full: string) => {
    liveTextRef.current = full
    lastUpdateRef.current = Date.now()
    setLiveText(full)
  }, [])
  const webSpeech = useWebSpeech(locale, handleSpeechUpdate)

  const currentField = fields.find((f) => !hasValue(f.getValue(draft)) && !skippedIds.has(f.id))

  React.useEffect(() => {
    if (!currentField) onComplete(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentField])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  })

  // Starts listening on its own as soon as a fresh question is on screen —
  // once per (field, retry) pair, and never right after a hard mic error
  // (that needs an explicit retry tap, so we don't loop forever against a
  // denied permission).
  React.useEffect(() => {
    if (!currentField || phase !== "asking" || micError) return
    const key = `${currentField.id}:${promptNonce}`
    if (autoStartKeyRef.current === key) return
    autoStartKeyRef.current = key
    startListening()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentField?.id, phase, promptNonce, micError])

  React.useEffect(() => {
    return () => {
      // Deliberately reads the *current* value, not a snapshot — this is a
      // monotonic invalidation counter (see startListening), not a DOM ref,
      // so there's nothing to go stale.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sessionIdRef.current++
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
    }
  }, [])

  if (!currentField) return null

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  function handleFinalResult(transcript: string, extracted: Partial<TDraft>) {
    if (!currentField) return
    const extractedValue = currentField.getValue(extracted)
    setPendingValue(hasValue(extractedValue) ? extractedValue!.trim() : transcript.trim())
    setPhase("confirming")
  }

  async function startListening() {
    setMicError(false)
    setLiveText("")
    liveTextRef.current = ""
    lastUpdateRef.current = Date.now()
    setPhase("listening")
    const mySession = ++sessionIdRef.current

    if (webSpeechSupported) {
      webSpeech
        .start()
        .then(async (transcript) => {
          clearSilenceTimer()
          if (sessionIdRef.current !== mySession) return
          if (!transcript.trim()) {
            setPhase("asking")
            return
          }
          setPhase("processing")
          try {
            const res = await apiFetch("/api/onboarding/voice/client-transcript", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ draftId, purpose, transcript, language: locale }),
            })
            const data = await res.json()
            if (sessionIdRef.current !== mySession) return
            if (!data.ok) {
              setMicError(true)
              setPhase("asking")
              return
            }
            handleFinalResult(transcript, data.draft)
          } catch {
            if (sessionIdRef.current === mySession) {
              setMicError(true)
              setPhase("asking")
            }
          }
        })
        .catch(() => {
          clearSilenceTimer()
          if (sessionIdRef.current === mySession) {
            setMicError(true)
            setPhase("asking")
          }
        })

      silenceTimerRef.current = setInterval(() => {
        if (liveTextRef.current.trim() && Date.now() - lastUpdateRef.current > SILENCE_STOP_MS) {
          clearSilenceTimer()
          webSpeech.stop()
        }
      }, 250)
    } else {
      try {
        await recorder.start()
      } catch {
        if (sessionIdRef.current === mySession) {
          setMicError(true)
          setPhase("asking")
        }
      }
    }
  }

  async function stopListening() {
    const mySession = sessionIdRef.current
    if (webSpeechSupported) {
      clearSilenceTimer()
      webSpeech.stop()
      return
    }
    setPhase("processing")
    try {
      const blob = await recorder.stop()
      if (sessionIdRef.current !== mySession) return
      const form = new FormData()
      form.append("audio", blob, "audio.webm")
      form.append("draftId", draftId)
      form.append("purpose", purpose)
      form.append("languageHint", locale === "hi" ? "hi-IN" : "en-IN")
      const res = await apiFetch("/api/onboarding/voice/transcribe", { method: "POST", body: form })
      const data = await res.json()
      if (sessionIdRef.current !== mySession) return
      if (!data.ok) {
        setMicError(true)
        setPhase("asking")
        return
      }
      handleFinalResult(data.transcript, data.draft)
    } catch {
      if (sessionIdRef.current === mySession) {
        setMicError(true)
        setPhase("asking")
      }
    }
  }

  function handleMicClick() {
    if (phase === "listening") stopListening()
    else if (phase === "asking" && micError) startListening()
  }

  function confirmYes() {
    if (!currentField) return
    setDraft((prev) => currentField.setValue(prev, pendingValue))
    setPendingValue("")
    setPhase("asking")
  }

  function confirmNo() {
    setPendingValue("")
    setPromptNonce((n) => n + 1)
    setPhase("asking")
  }

  function abandonListening() {
    sessionIdRef.current++
    clearSilenceTimer()
    if (webSpeechSupported) webSpeech.stop()
  }

  function submitTyped() {
    if (!currentField || !typedRef.current) return
    const value = typedRef.current.value.trim()
    if (!value) return
    if (phase === "listening") abandonListening()
    setDraft((prev) => currentField.setValue(prev, value))
    typedRef.current.value = ""
    setPhase("asking")
    setPromptNonce((n) => n + 1) // re-arm auto-start guard for the *next* field
  }

  function skip() {
    if (!currentField) return
    if (phase === "listening") abandonListening()
    setSkippedIds((prev) => new Set(prev).add(currentField.id))
  }

  function saveEdit(field: QnaField<TDraft>) {
    if (!editRef.current) return
    const value = editRef.current.value.trim()
    if (value) setDraft((prev) => field.setValue(prev, value))
    setEditingId(null)
  }

  const answered = fields.filter((f) => f.id !== currentField.id && hasValue(f.getValue(draft)))
  const listeningLabel = webSpeechSupported ? t("qnaListeningLive") : t("qnaListening")

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex max-h-[70vh] flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {answered.map((f) => (
          <div key={f.id} className={cn("flex flex-col gap-1.5", bubbleIn)}>
            <ChatBubble role="assistant">{t(f.promptKey)}</ChatBubble>
            {editingId === f.id ? (
              <div className="ml-6 flex items-center gap-2">
                <Input ref={editRef} defaultValue={f.getValue(draft)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit(f)} />
                <Button size="icon-sm" variant="ghost" onClick={() => saveEdit(f)}>
                  <Check className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditingId(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <ChatBubble role="user">
                <span className="flex items-center gap-2">
                  {f.getValue(draft)}
                  <button
                    type="button"
                    onClick={() => setEditingId(f.id)}
                    className="text-muted-foreground/70 hover:text-primary"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </span>
              </ChatBubble>
            )}
          </div>
        ))}

        <div className={cn("flex flex-col gap-3", bubbleIn)}>
          <TalkingPrompt
            key={`${currentField.id}-${promptNonce}`}
            promptKey={currentField.promptKey}
            locale={locale}
            text={t(currentField.promptKey)}
          />

          {phase === "confirming" ? (
            <div className={cn("flex flex-col gap-2", bubbleIn)}>
              <ChatBubble role="user">
                <HighlightedTranscript text={pendingValue} />
              </ChatBubble>
              <ChatBubble role="assistant">{t("qnaDidYouMean", { value: pendingValue })}</ChatBubble>
              <div className="ml-6 flex gap-2">
                <Button size="sm" onClick={confirmYes}>
                  <Check className="size-3.5" />
                  {t("qnaConfirmYes")}
                </Button>
                <Button size="sm" variant="outline" onClick={confirmNo}>
                  <X className="size-3.5" />
                  {t("qnaConfirmNo")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                ref={typedRef}
                placeholder={t(currentField.label)}
                onKeyDown={(e) => e.key === "Enter" && submitTyped()}
              />
              <div className="flex items-center justify-between">
                <Button variant="link" size="sm" onClick={submitTyped}>
                  {t("qnaTypeInstead")}
                </Button>
                {!currentField.required && (
                  <Button variant="ghost" size="sm" onClick={skip}>
                    {t("qnaSkip")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {phase !== "confirming" && (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4 sm:w-72 sm:shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span
              className={cn(
                "size-2.5 rounded-full",
                phase === "listening" ? "animate-pulse bg-primary" : "bg-muted-foreground/30"
              )}
            />
            {phase === "processing" ? t("micProcessing") : listeningLabel}
          </div>
          <div className="min-h-20 text-base leading-relaxed">
            {liveText ? (
              <HighlightedTranscript text={liveText} tone="onLight" />
            ) : phase === "processing" ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-sm text-muted-foreground/60">{t("qnaTapToSpeak")}</span>
            )}
          </div>
          {phase === "listening" && (
            <Button variant="outline" size="sm" onClick={handleMicClick} className="self-start">
              <Mic className="size-3.5" />
              {t("qnaStopListening")}
            </Button>
          )}
          {!webSpeechSupported && <p className="text-[11px] text-muted-foreground/70">{t("qnaWebSpeechUnavailable")}</p>}
          {micError && (
            <Button variant="outline" size="sm" onClick={handleMicClick}>
              <Mic className="size-3.5" />
              {t("qnaTryAgain")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ChatBubble({ role, children }: { role: "assistant" | "user"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          role === "assistant"
            ? "rounded-bl-sm bg-secondary text-secondary-foreground"
            : "rounded-br-sm bg-primary text-primary-foreground"
        )}
      >
        {children}
      </div>
    </div>
  )
}
