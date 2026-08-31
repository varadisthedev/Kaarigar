import { apiFetch } from "./api-client"

export type ProductDraft = {
  titleEn?: string
  titleHi?: string
  descriptionEn?: string
  descriptionHi?: string
  materials?: string[]
  dimensions?: string
}

export async function transcribeProductVoice(localUri: string, draftId: string): Promise<ProductDraft | null> {
  const form = new FormData()
  form.append("audio", { uri: localUri, type: "audio/m4a", name: "voice.m4a" } as unknown as Blob)
  form.append("draftId", draftId)
  form.append("purpose", "product_catalog")

  const res = await apiFetch("/api/onboarding/voice/transcribe", { method: "POST", body: form })
  if (!res.ok) return null
  const data = await res.json()
  return data.ok ? (data.draft as ProductDraft) : null
}
