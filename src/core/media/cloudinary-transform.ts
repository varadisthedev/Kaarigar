/**
 * Pure URL-building — Cloudinary applies these transforms on delivery, so
 * "enhancing" a photo this way costs nothing extra to upload and nothing to
 * compute server-side. This is the "AI Image Enhancer" for lighting/crop/
 * format; true background removal is the separate client-side WASM step
 * (see `components/media/photo-upload.tsx`) since Cloudinary's AI background
 * removal is a paid add-on.
 */
export function cloudinaryEnhancedUrl(cloudName: string, publicId: string): string {
  const transforms = [
    "e_improve",
    "e_auto_brightness",
    "e_sharpen:60",
    "c_pad",
    "b_auto",
    "ar_1:1",
    "w_1200",
    "f_auto",
    "q_auto",
  ].join(",")
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`
}

/** A smaller, unenhanced thumbnail — used for lists/cards where the full
 * enhancement pipeline is unnecessary bandwidth. */
export function cloudinaryThumbnailUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,ar_1:1,w_400,f_auto,q_auto/${publicId}`
}
