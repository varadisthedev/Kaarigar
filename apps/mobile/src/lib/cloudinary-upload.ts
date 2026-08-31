import { apiFetch } from "./api-client"

export type UploadKind = "product_photo" | "product_video"

/** Gets a signed upload from /api/media/sign, then uploads directly to
 * Cloudinary — mirrors apps/web/src/lib/cloudinary-upload.ts. */
export async function uploadToCloudinary(
  localUri: string,
  kind: UploadKind
): Promise<{ url: string; publicId: string }> {
  const signRes = await apiFetch("/api/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind }),
  })
  if (!signRes.ok) throw new Error("Failed to sign upload")
  const signed = await signRes.json()

  const resourceType = kind === "product_video" ? "video" : "image"
  const form = new FormData()
  form.append("file", { uri: localUri, type: resourceType === "video" ? "video/mp4" : "image/jpeg", name: "upload" } as unknown as Blob)
  form.append("api_key", signed.apiKey)
  form.append("timestamp", String(signed.timestamp))
  form.append("signature", signed.signature)
  form.append("folder", signed.folder)

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  })
  if (!uploadRes.ok) throw new Error("Cloudinary upload failed")
  const data = await uploadRes.json()
  return { url: data.secure_url, publicId: data.public_id }
}
