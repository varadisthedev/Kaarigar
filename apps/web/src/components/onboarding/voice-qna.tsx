"use client"

import * as React from "react"
import { Mic, MicOff, Loader2, Pencil, Check, X, AlertCircle, RefreshCw, ShieldAlert } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import { useWebSpeech, isWebSpeechSupported } from "@/hooks/use-web-speech"
import type { BusinessDraft, ProductDraft } from "@/core/business/draft"
import type { PromptKey } from "@/core/onboarding/voice-script"
import { craftCategories, resolveCraftCategory } from "@/config/craft-categories"
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

type Phase = "asking" | "listening" | "processing" | "confirming"

type MicAlert = {
  type: "permission" | "no-speech" | "network" | "fallback"
  message: string
}

function hasValue(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0
}

const SILENCE_STOP_MS = 2500

export function VoiceQna<TDraft extends BusinessDraft | ProductDraft>({
  draftId,
  locale,
  purpose,
  fields,
  initialDraft,
  onComplete,
}: {
  draftId: string
  locale: "en" | "hi" | "mr"
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
  const [activeEngine, setActiveEngine] = React.useState<"webspeech" | "recorder">(
    isWebSpeechSupported() ? "webspeech" : "recorder"
  )
  const [micAlert, setMicAlert] = React.useState<MicAlert | null>(null)

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

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  // Auto-start listening when a fresh question appears
  React.useEffect(() => {
    if (!currentField || phase !== "asking" || micAlert?.type === "permission") return
    const key = `${currentField.id}:${promptNonce}`
    if (autoStartKeyRef.current === key) return
    autoStartKeyRef.current = key

    // Slight delay to allow prompt audio/speech synthesis to initiate cleanly
    const timer = setTimeout(() => {
      startListening()
    }, 400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentField?.id, phase, promptNonce, micAlert?.type])

  React.useEffect(() => {
    return () => {
      sessionIdRef.current++
      clearSilenceTimer()
    }
  }, [])

  if (!currentField) return null

  function handleFinalResult(transcript: string, extracted: Partial<TDraft>) {
    if (!currentField) return
    let extractedValue = currentField.getValue(extracted)

    // If asking for craft category, dynamically resolve to related craft or create a new category — never "Other"
    if (currentField.id === "craftCategory") {
      if (!extractedValue || extractedValue.toLowerCase() === "other") {
        extractedValue = resolveCraftCategory(transcript) || transcript.trim()
      }
    }

    // If asking for product title, avoid replacing the user's specific spoken title with a generic category name
    if (currentField.id === "title" && extractedValue) {
      const isGenericCategory = craftCategories.some(
        (c) => c.labelEn.toLowerCase() === extractedValue?.toLowerCase()
      )
      if (isGenericCategory && transcript.trim().toLowerCase() !== extractedValue.toLowerCase()) {
        extractedValue = transcript.trim()
      }
    }
    const finalVal = hasValue(extractedValue) ? extractedValue!.trim() : transcript.trim()
    setPendingValue(finalVal)
    setPhase("confirming")
    setMicAlert(null)
  }

  async function startListening(overrideEngine?: "webspeech" | "recorder") {
    const engineToUse = overrideEngine ?? activeEngine
    setMicAlert(null)
    setLiveText("")
    liveTextRef.current = ""
    lastUpdateRef.current = Date.now()
    setPhase("listening")
    const mySession = ++sessionIdRef.current

    if (engineToUse === "webspeech" && isWebSpeechSupported()) {
      webSpeech
        .start()
        .then(async (transcript) => {
          clearSilenceTimer()
          if (sessionIdRef.current !== mySession) return
          if (!transcript.trim()) {
            setPhase("asking")
            setMicAlert({
              type: "no-speech",
              message:
                locale === "mr"
                  ? "काहीही ऐकू आले नाही. बोलण्यासाठी पुन्हा मायक्रोफोन टॅप करा किंवा खाली टाइप करा."
                  : locale === "hi"
                    ? "कोई आवाज़ नहीं सुनी गई। बोलने के लिए माइक दबाएं या नीचे टाइप करें।"
                    : "No speech detected. Tap the mic to try again, or type below.",
            })
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
              setPhase("asking")
              setMicAlert({
                type: "network",
                message:
                  locale === "mr"
                    ? "प्रक्रिया करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा किंवा टाइप करा."
                    : locale === "hi"
                      ? "प्रोसेसिंग में त्रुटि हुई। कृपया पुनः प्रयास करें या टाइप करें।"
                      : "Processing error. Please try speaking again or type below.",
              })
              return
            }
            handleFinalResult(transcript, data.draft)
          } catch {
            if (sessionIdRef.current === mySession) {
              setPhase("asking")
              setMicAlert({
                type: "network",
                message:
                  locale === "mr"
                    ? "सर्व्हरशी संपर्क होऊ शकला नाही. खाली टाइप करू शकता."
                    : locale === "hi"
                      ? "सर्वर से कनेक्ट नहीं हो सका। आप नीचे टाइप कर सकते हैं।"
                      : "Server unreachable. You can type your answer below.",
              })
            }
          }
        })
        .catch(async (err: Error) => {
          clearSilenceTimer()
          if (sessionIdRef.current !== mySession) return

          if (err.message === "not-allowed") {
            setPhase("asking")
            setMicAlert({
              type: "permission",
              message:
                locale === "mr"
                  ? "मायक्रोफोन परवानगी अवरोधित आहे. कृपया ब्राउझरमध्ये मायक्रोफोन परवानगी द्या किंवा खाली टाइप करा."
                  : locale === "hi"
                    ? "माइक की अनुमति अवरुद्ध है। कृपया ब्राउज़र में माइक की अनुमति दें या नीचे टाइप करें।"
                    : "Microphone permission is blocked. Please allow mic access in browser settings or type below.",
            })
            typedRef.current?.focus()
            return
          }

          // Auto-fallback: If Web Speech fails (network or capture error), automatically switch to MediaRecorder
          console.warn("[VoiceQna] Web Speech failed, auto-falling back to MediaRecorder audio capture:", err)
          setActiveEngine("recorder")
          setMicAlert({
            type: "fallback",
            message:
              locale === "mr"
                ? "थेट कॅप्शन उपलब्ध नाही — ऑडिओ रेकॉर्डिंग मोड सुरू करत आहोत..."
                : locale === "hi"
                  ? "लाइव कैप्शन उपलब्ध नहीं — ऑडियो रिकॉर्डिंग मोड शुरू कर रहे हैं..."
                  : "Live speech recognition unavailable. Switching to audio recording fallback...",
          })
          try {
            await recorder.start()
          } catch (recErr) {
            setPhase("asking")
            setMicAlert({
              type: "permission",
              message:
                locale === "mr"
                  ? "मायक्रोफोन सुरू करता आला नाही. कृपया खाली टाइप करा."
                  : locale === "hi"
                    ? "माइक शुरू नहीं हो सका। कृपया नीचे टाइप करें।"
                    : "Microphone could not be started. Please type your response below.",
            })
          }
        })

      // Silence detector to stop cleanly after user pauses
      silenceTimerRef.current = setInterval(() => {
        if (liveTextRef.current.trim() && Date.now() - lastUpdateRef.current > SILENCE_STOP_MS) {
          clearSilenceTimer()
          webSpeech.stop()
        }
      }, 250)
    } else {
      // Direct MediaRecorder tier
      try {
        await recorder.start()
      } catch (err: unknown) {
        if (sessionIdRef.current === mySession) {
          setPhase("asking")
          const errName = err instanceof Error ? err.name : "Error"
          const isPerm = errName === "NotAllowedError" || errName === "PermissionDeniedError"
          setMicAlert({
            type: isPerm ? "permission" : "network",
            message: isPerm
              ? locale === "mr"
                ? "मायक्रोफोन परवानगी आवश्यक आहे. कृपया ब्राउझर सेटिंग्ज तपासा किंवा खाली टाइप करा."
                : locale === "hi"
                  ? "माइक की अनुमति आवश्यक है। कृपया ब्राउज़र सेटिंग जांचें या नीचे टाइप करें।"
                  : "Microphone access required. Please grant permission in your browser or type below."
              : locale === "mr"
                ? "मायक्रोफोन सुरू करता आला नाही. कृपया खाली टाइप करा."
                : locale === "hi"
                  ? "माइक शुरू नहीं हो सका। कृपया नीचे टाइप करें।"
                  : "Could not access microphone. Please type your response below.",
          })
          typedRef.current?.focus()
        }
      }
    }
  }

  async function stopListening() {
    const mySession = sessionIdRef.current
    if (activeEngine === "webspeech" && isWebSpeechSupported()) {
      clearSilenceTimer()
      webSpeech.stop()
      return
    }

    setPhase("processing")
    try {
      const blob = await recorder.stop()
      if (sessionIdRef.current !== mySession) return
      if (!blob || blob.size === 0) {
        setPhase("asking")
        setMicAlert({
          type: "no-speech",
          message:
            locale === "mr"
              ? "काहीही रेकॉर्ड झाले नाही. पुन्हा प्रयत्न करण्यासाठी टॅप करा किंवा टाइप करा."
              : locale === "hi"
                ? "कुछ भी रिकॉर्ड नहीं हुआ। फिर से प्रयास करने के लिए टैप करें या टाइप करें।"
                : "No audio recorded. Tap to speak again, or type below.",
        })
        return
      }

      const form = new FormData()
      form.append("audio", blob, "audio.webm")
      form.append("draftId", draftId)
      form.append("purpose", purpose)
      form.append("languageHint", locale === "hi" ? "hi-IN" : locale === "mr" ? "mr-IN" : "en-IN")

      const res = await apiFetch("/api/onboarding/voice/transcribe", { method: "POST", body: form })
      const data = await res.json()
      if (sessionIdRef.current !== mySession) return
      if (!data.ok || !data.transcript?.trim()) {
        setPhase("asking")
        setMicAlert({
          type: "no-speech",
          message:
            locale === "mr"
              ? "आवाज स्पष्ट समजला नाही. पुन्हा प्रयत्न करा किंवा खाली टाइप करा."
              : locale === "hi"
                ? "आवाज़ स्पष्ट नहीं समझी जा सकी। पुनः प्रयास करें या नीचे टाइप करें।"
                : "Couldn't clearly understand audio. Tap to try again or type below.",
        })
        return
      }
      handleFinalResult(data.transcript, data.draft)
    } catch {
      if (sessionIdRef.current === mySession) {
        setPhase("asking")
        setMicAlert({
          type: "network",
          message:
            locale === "mr"
              ? "ऑडिओ पाठवताना त्रुटी आली. आपण खाली टाइप करू शकता."
              : locale === "hi"
                ? "ऑडियो भेजने में समस्या आई। आप नीचे टाइप कर सकते हैं।"
                : "Error uploading audio. You can type your answer below.",
        })
      }
    }
  }

  function handleMicClick() {
    if (phase === "listening") {
      stopListening()
    } else {
      setMicAlert(null)
      startListening()
    }
  }

  function confirmYes() {
    if (!currentField) return
    setDraft((prev) => currentField.setValue(prev, pendingValue))
    setPendingValue("")
    setMicAlert(null)
    setPhase("asking")
  }

  function confirmNo() {
    setPendingValue("")
    setPromptNonce((n) => n + 1)
    setMicAlert(null)
    setPhase("asking")
  }

  function abandonListening() {
    sessionIdRef.current++
    clearSilenceTimer()
    if (activeEngine === "webspeech") webSpeech.abort()
    else recorder.cancel()
    setPhase("asking")
  }

  function submitTyped() {
    if (!currentField || !typedRef.current) return
    const value = typedRef.current.value.trim()
    if (!value) return
    if (phase === "listening") abandonListening()
    setDraft((prev) => currentField.setValue(prev, value))
    typedRef.current.value = ""
    setMicAlert(null)
    setPhase("asking")
    setPromptNonce((n) => n + 1) // re-arm auto-start guard for the *next* field
  }

  function skip() {
    if (!currentField) return
    if (phase === "listening") abandonListening()
    setMicAlert(null)
    setSkippedIds((prev) => new Set(prev).add(currentField.id))
  }

  function saveEdit(field: QnaField<TDraft>) {
    if (!editRef.current) return
    const value = editRef.current.value.trim()
    if (value) setDraft((prev) => field.setValue(prev, value))
    setEditingId(null)
  }

  const answered = fields.filter((f) => f.id !== currentField.id && hasValue(f.getValue(draft)))

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
      <div className="flex min-h-[380px] max-h-[75vh] flex-1 flex-col gap-4 overflow-y-auto pr-2">
        {answered.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <ChatBubble role="assistant">{t(f.promptKey)}</ChatBubble>
            {editingId === f.id ? (
              <div className="ml-6 flex items-center gap-2">
                <Input ref={editRef} defaultValue={f.getValue(draft)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit(f)} className="h-10 text-sm sm:text-base" />
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
                    aria-label="Edit answer"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </span>
              </ChatBubble>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between rounded-lg bg-secondary/70 px-3.5 py-2 text-xs font-medium text-muted-foreground">
            <span>
              {locale === "mr"
                ? `प्रश्न ${fields.findIndex((f) => f.id === currentField.id) + 1} / ${fields.length}`
                : locale === "hi"
                  ? `प्रश्न ${fields.findIndex((f) => f.id === currentField.id) + 1} / ${fields.length}`
                  : `Question ${fields.findIndex((f) => f.id === currentField.id) + 1} of ${fields.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              {fields.map((f, i) => {
                const currentIdx = fields.findIndex((field) => field.id === currentField.id)
                return (
                  <span
                    key={f.id}
                    className={cn(
                      "h-1.5 w-6 rounded-full transition-all duration-300",
                      i < currentIdx
                        ? "bg-primary"
                        : i === currentIdx
                          ? "bg-primary shadow-xs"
                          : "bg-muted-foreground/25"
                    )}
                  />
                )
              })}
            </div>
          </div>

          <TalkingPrompt
            key={`${currentField.id}-${promptNonce}`}
            promptKey={currentField.promptKey}
            locale={locale}
            text={t(currentField.promptKey)}
          />

          {/* Prominent User Alerts for Microphone Status */}
          {micAlert && (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3.5 text-xs sm:text-sm animate-in fade-in duration-150",
                micAlert.type === "permission"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  : "border-primary/20 bg-primary/5 text-foreground"
              )}
            >
              {micAlert.type === "permission" ? (
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              <div className="flex-1">
                <p className="leading-relaxed font-medium">{micAlert.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startListening()}>
                    <RefreshCw className="mr-1 size-3" />
                    {locale === "mr" ? "मायक्रोफोन पुन्हा सुरू करा" : locale === "hi" ? "माइक पुनः शुरू करें" : "Retry Microphone"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === "confirming" ? (
            <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <ChatBubble role="user">
                <HighlightedTranscript text={pendingValue} />
              </ChatBubble>
              <ChatBubble role="assistant">{t("qnaDidYouMean", { value: pendingValue })}</ChatBubble>
              <div className="ml-6 flex gap-2.5 pt-1">
                <Button size="default" onClick={confirmYes} className="h-10 px-5">
                  <Check className="mr-1 size-4" />
                  {t("qnaConfirmYes")}
                </Button>
                <Button size="default" variant="outline" onClick={confirmNo} className="h-10 px-5">
                  <X className="mr-1 size-4" />
                  {t("qnaConfirmNo")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <Input
                  ref={typedRef}
                  placeholder={t(currentField.label)}
                  onKeyDown={(e) => e.key === "Enter" && submitTyped()}
                  className="h-11 flex-1 text-sm sm:text-base"
                />
                <Button size="default" onClick={submitTyped} className="h-11 shrink-0 px-5 text-sm sm:text-base">
                  {t("qnaNext")}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="link" size="sm" onClick={submitTyped} className="px-0 text-xs sm:text-sm">
                  {t("qnaTypeInstead")}
                </Button>
                {!currentField.required && (
                  <Button variant="ghost" size="sm" onClick={skip} className="text-xs sm:text-sm">
                    {t("qnaSkip")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Voice Status & Live Visualizer Card */}
      {phase !== "confirming" && (
        <div className="flex w-full flex-col gap-3.5 rounded-xl border border-border bg-card/70 p-5 shadow-xs backdrop-blur-xs md:w-80 lg:w-96 md:shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground sm:text-sm">
              <span
                className={cn(
                  "size-2.5 rounded-full transition-all",
                  phase === "listening"
                    ? "animate-pulse bg-red-500 shadow-xs shadow-red-500/50"
                    : phase === "processing"
                      ? "animate-spin bg-primary"
                      : "bg-muted-foreground/30"
                )}
              />
              {phase === "processing"
                ? t("micProcessing")
                : phase === "listening"
                  ? locale === "mr"
                    ? "ऐकत आहोत… आपण बोलू शकता"
                    : locale === "hi"
                      ? "सुन रहे हैं… आप बोल सकते हैं"
                      : "Listening… Speak now"
                  : t("micIdle")}
            </div>

            {/* Pulsing Audio Waves when active */}
            {phase === "listening" && (
              <div className="flex items-center gap-1">
                <span className="h-3.5 w-0.5 animate-pulse bg-primary [animation-delay:0ms]" />
                <span className="h-5 w-0.5 animate-pulse bg-primary [animation-delay:150ms]" />
                <span className="h-3 w-0.5 animate-pulse bg-primary [animation-delay:300ms]" />
                <span className="h-6 w-0.5 animate-pulse bg-primary [animation-delay:75ms]" />
                <span className="h-4 w-0.5 animate-pulse bg-primary [animation-delay:225ms]" />
              </div>
            )}
          </div>

          {/* Live speech captions or placeholder */}
          <div className="flex min-h-24 md:min-h-32 flex-col justify-center rounded-lg border border-border/40 bg-secondary/40 p-3.5 text-sm sm:text-base leading-relaxed">
            {liveText ? (
              <HighlightedTranscript text={liveText} tone="onLight" />
            ) : phase === "processing" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>{t("micProcessing")}</span>
              </div>
            ) : phase === "listening" ? (
              <span className="text-sm text-muted-foreground animate-pulse">
                {locale === "mr" ? "आवाज ऐकत आहोत..." : locale === "hi" ? "आवाज़ सुन रहे हैं..." : "Capturing your voice..."}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/70">{t("qnaTapToSpeak")}</span>
            )}
          </div>

          {/* Interactive Mic Action Buttons */}
          <div className="flex items-center gap-2">
            {phase === "listening" ? (
              <Button variant="default" size="default" onClick={handleMicClick} className="h-11 w-full text-sm font-medium sm:text-base">
                <MicOff className="mr-2 size-4" />
                {t("qnaStopListening")}
              </Button>
            ) : (
              <Button variant="outline" size="default" onClick={handleMicClick} className="h-11 w-full text-sm font-medium sm:text-base">
                <Mic className="mr-2 size-4 text-primary" />
                {t("micIdle")}
              </Button>
            )}
          </div>

          {activeEngine === "recorder" && (
            <p className="text-xs text-muted-foreground/70">
              {locale === "mr"
                ? "थेट ऑडिओ रेकॉर्डिंग चालू आहे — बोलून झाल्यावर बटन दाबा."
                : locale === "hi"
                  ? "सीधे ऑडियो रिकॉर्डिंग चालू है — बोलने के बाद बटन दबाएं।"
                  : "Direct audio recording active — tap button when finished."}
            </p>
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
          "max-w-[90%] sm:max-w-[85%] rounded-2xl px-4.5 py-3 text-sm sm:text-base leading-relaxed",
          role === "assistant"
            ? "rounded-bl-sm border border-border bg-secondary text-secondary-foreground shadow-xs"
            : "rounded-br-sm bg-primary text-primary-foreground shadow-xs"
        )}
      >
        {children}
      </div>
    </div>
  )
}
