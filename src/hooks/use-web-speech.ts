"use client"

import * as React from "react"

// Minimal structural types for the (non-standard, vendor-prefixed) Web
// Speech API — lib.dom.d.ts doesn't declare these.
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } }
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
type SpeechRecognitionErrorEventLike = { error: string }

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null
}

export function isWebSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

/** Browser-native fallback tier — used only when no server speech provider
 * is configured. Runs entirely client-side; only the resulting text ever
 * reaches the server (via /api/onboarding/voice/client-transcript). */
export function useWebSpeech(lang: "en" | "hi") {
  const [isListening, setIsListening] = React.useState(false)
  const [interimTranscript, setInterimTranscript] = React.useState("")
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)

  const start = React.useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) {
        reject(new Error("unsupported"))
        return
      }
      const recognition = new Ctor()
      recognition.lang = lang === "hi" ? "hi-IN" : "en-IN"
      recognition.interimResults = true
      recognition.continuous = false

      let finalTranscript = ""
      recognition.onresult = (event) => {
        let interim = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript
          if (event.results[i].isFinal) finalTranscript += chunk
          else interim += chunk
        }
        setInterimTranscript(interim)
      }
      recognition.onerror = (event) => reject(new Error(event.error ?? "speech_error"))
      recognition.onend = () => {
        setIsListening(false)
        resolve(finalTranscript.trim())
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
    })
  }, [lang])

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { isListening, interimTranscript, start, stop }
}
