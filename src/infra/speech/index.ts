import "server-only"
import { features } from "@/config/env"
import type { SpeechProvider } from "@/core/business/ports"

import { sarvamSpeechProvider } from "./sarvam.provider"
import { indicServiceSpeechProvider } from "./indic-service.provider"

/** Ordered fallback chain — Sarvam first, then the Python ML service. Empty
 * when neither is configured, which is the signal to the client to use the
 * browser's Web Speech API instead. */
export function getSpeechProviderChain(): SpeechProvider[] {
  const chain: SpeechProvider[] = []
  if (features.sarvam) chain.push(sarvamSpeechProvider)
  if (features.mlService) chain.push(indicServiceSpeechProvider)
  return chain
}
