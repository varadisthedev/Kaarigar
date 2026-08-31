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
  abort: () => void
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

export type WebSpeechErrorType = "not-allowed" | "no-speech" | "network" | "audio-capture" | "unknown"

/** Browser-native fallback tier — used only when no server speech provider
 * is configured. Runs entirely client-side; only the resulting text ever
 * reaches the server (via /api/onboarding/voice/client-transcript).
 *
 * `onUpdate`, when given, fires on every result event with the *full*
 * text heard so far (finalized parts + the current interim chunk) — the
 * conversational onboarding UI uses this for live captions and for its own
 * silence-based auto-stop timer. */
export function useWebSpeech(lang: "en" | "hi" | "mr", onUpdate?: (fullText: string) => void) {
  const [isListening, setIsListening] = React.useState(false)
  const [interimTranscript, setInterimTranscript] = React.useState("")
  const [lastError, setLastError] = React.useState<WebSpeechErrorType | null>(null)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const onUpdateRef = React.useRef(onUpdate)
  React.useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const stop = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore already stopped
      }
    }
  }, [])

  const abort = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore already stopped
      }
    }
    setIsListening(false)
  }, [])

  const start = React.useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) {
        setLastError("unknown")
        reject(new Error("unsupported"))
        return
      }

      // Safely abort any previously running recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }

      setLastError(null)
      setInterimTranscript("")

      let recognition: SpeechRecognitionLike
      try {
        recognition = new Ctor()
      } catch (err) {
        setLastError("unknown")
        reject(err instanceof Error ? err : new Error("failed_to_initialize"))
        return
      }

      recognition.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN"
      recognition.interimResults = true
      recognition.continuous = true

      let finalTranscript = ""
      let hasReceivedResult = false

      recognition.onresult = (event) => {
        hasReceivedResult = true
        let interim = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? " " : "") + chunk
          } else {
            interim += (interim ? " " : "") + chunk
          }
        }
        setInterimTranscript(interim)
        const combined = (finalTranscript + " " + interim).trim()
        onUpdateRef.current?.(combined)
      }

      recognition.onerror = (event) => {
        const err = event.error || "unknown"
        if (err === "no-speech") {
          // Non-fatal: user was quiet. If we already got any result, resolve it; otherwise note error
          setLastError("no-speech")
          if (hasReceivedResult && finalTranscript.trim()) {
            return
          }
          return
        }

        if (err === "aborted") {
          // User or program stopped
          return
        }

        if (err === "not-allowed" || err === "service-not-allowed") {
          setLastError("not-allowed")
          setIsListening(false)
          reject(new Error("not-allowed"))
          return
        }

        if (err === "network") {
          setLastError("network")
          setIsListening(false)
          reject(new Error("network"))
          return
        }

        if (err === "audio-capture") {
          setLastError("audio-capture")
          setIsListening(false)
          reject(new Error("audio-capture"))
          return
        }

        setLastError("unknown")
        setIsListening(false)
        reject(new Error(err))
      }

      recognition.onend = () => {
        setIsListening(false)
        recognitionRef.current = null
        resolve(finalTranscript.trim())
      }

      try {
        recognition.start()
        recognitionRef.current = recognition
        setIsListening(true)
      } catch (err) {
        setIsListening(false)
        setLastError("unknown")
        reject(err instanceof Error ? err : new Error("failed_to_start"))
      }
    })
  }, [lang])

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
    }
  }, [])

  return { isListening, interimTranscript, lastError, start, stop, abort }
}
