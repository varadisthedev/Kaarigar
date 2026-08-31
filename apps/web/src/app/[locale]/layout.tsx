import type { Metadata } from "next"
import { Geist_Mono, Inter, Noto_Serif, Noto_Sans_Devanagari } from "next/font/google"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const notoSerifHeading = Noto_Serif({ subsets: ["latin"], variable: "--font-heading" })
// Devanagari has no Latin glyphs of its own — this is what makes Hindi pages
// look designed rather than a fallback-font afterthought. Activated via the
// `html[lang="hi"]` override in globals.css, not applied unconditionally.
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
})
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Kaarigar — Indian Artisans, Direct to Business",
  description:
    "A B2B marketplace connecting India's marginalized artisans and weavers directly with buyers.",
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Renders this layout as static per-locale HTML rather than opting the
  // whole subtree into dynamic rendering.
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        notoSerifHeading.variable,
        notoSansDevanagari.variable
      )}
    >
      <body>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
