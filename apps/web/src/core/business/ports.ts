/**
 * Server-side speech-to-text providers, tried in order: Sarvam AI first,
 * then the Python AI4Bharat microservice. If BOTH are unavailable/unconfigured,
 * `onboarding.service.ts` reports that back to the client, which falls back
 * to the browser's own Web Speech API — a third tier that isn't a
 * `SpeechProvider` at all, since it never touches the server (recognition
 * happens client-side and only the resulting text is sent up).
 */
export interface SpeechProvider {
  readonly name: "sarvam" | "indic_service"
  transcribe(input: {
    audio: Buffer
    mimeType: string
    languageHint?: string
  }): Promise<{ transcript: string; language: string; translationEn?: string }>
}
