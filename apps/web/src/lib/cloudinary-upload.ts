import { apiFetch } from "@/lib/api-fetch"

export type UploadKind = "onboarding_photo" | "onboarding_video" | "avatar" | "product_photo" | "product_video" | "chat_photo"

export type UploadedAsset = { url: string; publicId: string; cloudName: string }

/** Gets a signed upload slot from our server, then uploads directly to
 * Cloudinary — the API secret never touches the browser. Resource type
 * (image vs video) is chosen by which Cloudinary endpoint we POST to, not by
 * anything in the signature itself, so the signing route needs no changes
 * beyond knowing which folder a kind belongs in. */
export async function uploadToCloudinary(
  file: File | Blob,
  kind: UploadKind,
  draftId?: string
): Promise<UploadedAsset> {
  const signRes = await apiFetch("/api/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, draftId }),
  })
  if (!signRes.ok) {
    const body = await signRes.json().catch(() => ({}))
    throw new Error(body.error === "cloudinary_not_configured" ? "cloudinary_not_configured" : "sign_failed")
  }
  const signed = await signRes.json()

  const form = new FormData()
  form.append("file", file)
  form.append("api_key", signed.apiKey)
  form.append("timestamp", String(signed.timestamp))
  form.append("signature", signed.signature)
  form.append("folder", signed.folder)

  const resourceType = kind === "onboarding_video" || kind === "product_video" ? "video" : "image"
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  })
  if (!uploadRes.ok) throw new Error("upload_failed")

  const data = await uploadRes.json()
  return { url: data.secure_url as string, publicId: data.public_id as string, cloudName: signed.cloudName as string }
}
