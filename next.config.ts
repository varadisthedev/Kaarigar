import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const isDev = process.env.NODE_ENV !== "production"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Cloudinary/Razorpay checkout need script/frame allowances; Unsplash is
    // image-only. Tightened further once real domains/CDNs are finalized.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'wasm-unsafe-eval' is for @imgly/background-removal compiling its
      // ONNX/WASM model client-side — narrower than 'unsafe-eval'. Dev-only,
      // 'unsafe-eval' is also added: React's development build calls plain
      // eval() to reconstruct component stack traces for its debugging
      // overlays — it never does this in production, so prod stays on the
      // narrower policy.
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com`,
      "style-src 'self' 'unsafe-inline'",
      // *.tile.openstreetmap.org serves the approximate-location map's tiles
      // (free, no key — same usage-policy tradeoff already accepted for
      // Nominatim's reverse-geocoding, fine at MVP traffic).
      "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.tile.openstreetmap.org",
      "font-src 'self' data:",
      // staticimgly.com serves the background-removal model/wasm assets.
      // Pusher Channels (real-time chat): wss:// for the live socket, https
      // for its REST-based auth/fallback transports.
      "connect-src 'self' https://api.razorpay.com https://*.neon.tech https://api.cloudinary.com https://staticimgly.com wss://ws-*.pusher.com https://sockjs-*.pusher.com https://*.pusher.com",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)
