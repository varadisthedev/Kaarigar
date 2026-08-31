"use client"

import * as React from "react"

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/aac",
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ""
}

/** MediaRecorder-based capture, used when a server speech provider (Sarvam
 * or the Python ML service) is configured or as an automatic fallback when
 * browser speech recognition is unavailable or fails. */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = React.useState(false)
  const [recorderError, setRecorderError] = React.useState<string | null>(null)
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)

  const stopTracks = React.useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop())
      } catch {
        // ignore
      }
      streamRef.current = null
    }
  }, [])

  const start = React.useCallback(async () => {
    setRecorderError(null)
    chunksRef.current = []

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not supported")
      }

      // Stop any existing stream
      stopTracks()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = (e) => {
        console.warn("[useVoiceRecorder] MediaRecorder error:", e)
        setRecorderError("recorder_error")
      }

      recorder.start(100) // Collect data every 100ms
      recorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      stopTracks()
      setIsRecording(false)
      const errName = err instanceof Error ? err.name : "unknown"
      setRecorderError(errName)
      throw err
    }
  }, [stopTracks])

  const stop = React.useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === "inactive") {
        stopTracks()
        setIsRecording(false)
        const mimeType = getSupportedMimeType() || "audio/webm"
        resolve(new Blob(chunksRef.current, { type: mimeType }))
        return
      }

      recorder.onstop = () => {
        stopTracks()
        const mimeType = recorder.mimeType || getSupportedMimeType() || "audio/webm"
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setIsRecording(false)
        recorderRef.current = null
        resolve(blob)
      }

      try {
        recorder.stop()
      } catch {
        stopTracks()
        setIsRecording(false)
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }))
      }
    })
  }, [stopTracks])

  const cancel = React.useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    stopTracks()
    chunksRef.current = []
    setIsRecording(false)
    recorderRef.current = null
  }, [stopTracks])

  React.useEffect(() => {
    return () => {
      stopTracks()
    }
  }, [stopTracks])

  return { isRecording, recorderError, start, stop, cancel }
}
