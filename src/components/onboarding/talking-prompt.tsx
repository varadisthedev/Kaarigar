"use client"

import * as React from "react"
import { Volume2 } from "lucide-react"

import type { PromptKey } from "@/core/onboarding/voice-script"

/** Narrates one fixed onboarding prompt — ElevenLabs audio when configured
 * (cached server-side, see the prompt-audio route), the browser's built-in
 * speechSynthesis otherwise. Always renders the text too: narration never
 * blocks progress, and autoplay can be blocked by the browser regardless. */
export function TalkingPrompt({
  promptKey,
  locale,
  text,
  className,
}: {
  promptKey: PromptKey
  locale: "en" | "hi"
  text: string
  className?: string
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function play() {
      try {
        const res = await fetch(`/api/onboarding/voice/prompt-audio?key=${promptKey}&locale=${locale}`)
        const data = await res.json().catch(() => ({ ok: false }))
        if (cancelled) return

        if (data.ok && data.url) {
          const audio = new Audio(data.url)
          audioRef.current = audio
          audio.play().catch(() => {})
          return
        }
      } catch {
        // fall through to speechSynthesis below
      }

      if (!cancelled && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = locale === "hi" ? "hi-IN" : "en-IN"
        window.speechSynthesis.speak(utterance)
      }
    }

    play()
    return () => {
      cancelled = true
      audioRef.current?.pause()
      window.speechSynthesis?.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptKey, locale])

  return (
    <div className={className ?? "flex items-start gap-2"}>
      <Volume2 className="mt-0.5 size-5 shrink-0 text-primary" />
      <p className="font-heading text-lg font-medium text-foreground">{text}</p>
    </div>
  )
}
