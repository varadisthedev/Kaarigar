import "server-only"
import { GoogleGenAI, Type } from "@google/genai"

import { env } from "@/config/env"

let _client: GoogleGenAI | null = null

function client(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! })
  return _client
}

const MODEL = "gemini-2.5-flash"

/** Structured JSON generation — the model is constrained to `schema` via
 * Gemini's native responseSchema support, so callers get a parsed object
 * back (or throw) rather than needing to coax/parse free text. */
export async function generateStructured<T>(input: {
  systemInstruction: string
  prompt: string
  schema: Record<string, unknown>
}): Promise<T> {
  const response = await client().models.generateContent({
    model: MODEL,
    contents: input.prompt,
    config: {
      systemInstruction: input.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: input.schema,
    },
  })

  const text = response.text
  if (!text) throw new Error("Gemini returned an empty response")
  return JSON.parse(text) as T
}

export { Type as GeminiType }
