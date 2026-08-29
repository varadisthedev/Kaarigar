/** Dynamically imported so the ~size-able WASM/ONNX runtime only loads when
 * an artisan actually taps "Remove background", not on every page load. */
export async function removeImageBackground(file: File | Blob): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal")
  return removeBackground(file)
}
