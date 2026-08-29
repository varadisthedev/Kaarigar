const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

let loadPromise: Promise<void> | null = null

/** Loads Razorpay's checkout script once and caches the promise — safe to
 * call from multiple components without racing duplicate <script> tags. */
export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"))
    document.body.appendChild(script)
  })
  return loadPromise
}
