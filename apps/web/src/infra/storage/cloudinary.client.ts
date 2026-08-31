import "server-only"
import { v2 as cloudinary } from "cloudinary"

import { env, features } from "@/config/env"

let configured = false
function ensureConfigured() {
  if (configured) return
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  configured = true
}

/** Signs an upload so the API secret never reaches the browser — the client
 * uploads directly to Cloudinary with these params. */
export function signUpload(params: { folder: string; publicId?: string }): {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  publicId?: string
} {
  if (!features.cloudinary) {
    throw new Error(
      "Cloudinary is not configured — add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, " +
        "and CLOUDINARY_API_SECRET to .env.local."
    )
  }
  ensureConfigured()

  const timestamp = Math.round(Date.now() / 1000)
  const toSign: Record<string, string | number> = { timestamp, folder: params.folder }
  if (params.publicId) toSign.public_id = params.publicId

  const signature = cloudinary.utils.api_sign_request(toSign, env.CLOUDINARY_API_SECRET!)

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder: params.folder,
    publicId: params.publicId,
  }
}

/** Used when replacing/deleting an avatar or media item — deletes the
 * previous Cloudinary asset so orphaned uploads don't accumulate. */
export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  if (!features.cloudinary) return
  ensureConfigured()
  await cloudinary.uploader.destroy(publicId).catch((err) => {
    console.error(`[cloudinary] failed to delete asset "${publicId}":`, err)
  })
}
