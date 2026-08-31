/** The fixed, enumerable set of narrated prompts in the conversational
 * onboarding flow. Kept as a closed list (rather than arbitrary free text)
 * so every clip ElevenLabs is ever asked to synthesize is known in advance —
 * this is what makes the Cloudinary cache in
 * `/api/onboarding/voice/prompt-audio` a *permanent*, fully enumerable one:
 * each key+locale pair is synthesized at most once, globally, ever. */
export const PROMPT_KEYS = [
  "promptBusinessName",
  "promptCraftCategory",
  "promptDescription",
  "promptYearsExperience",
  "promptMonthlyCapacity",
  "promptLocationIntro",
  "promptBusinessPhotosIntro",
  "promptVideoIntro",
  "promptProductTitle",
  "promptProductDescription",
  "promptProductMaterials",
  "promptProductPrice",
  "promptProductPhotosIntro",
] as const

export type PromptKey = (typeof PROMPT_KEYS)[number]

export function isPromptKey(value: string): value is PromptKey {
  return (PROMPT_KEYS as readonly string[]).includes(value)
}
