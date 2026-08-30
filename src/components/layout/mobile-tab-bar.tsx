"use client"

import { Home, Store, MessageSquare, User } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

// No separate "Sell" tab — / (Home) is the seller dashboard/entry point now,
// so a second tab pointing at the same destination would just duplicate it.
export function MobileTabBar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations("nav")
  const pathname = usePathname()

  const items = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/marketplace", label: t("marketplace"), icon: Store },
    { href: "/inquiries", label: t("inquiries"), icon: MessageSquare },
    { href: isAuthenticated ? "/account" : "/login", label: isAuthenticated ? t("account") : t("login"), icon: User },
  ] as const

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background md:hidden">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
