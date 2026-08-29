"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Light theme only, for now.
 *
 * next-themes stays wired up (attribute="class", .dark tokens already defined
 * in globals.css) so that shipping dark mode later is a matter of removing
 * `forcedTheme` and adding a toggle — not a rewrite. Until then the theme is
 * pinned to "light" and no in-app control can change it.
 */
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
