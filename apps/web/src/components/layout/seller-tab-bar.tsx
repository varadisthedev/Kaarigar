"use client"

import { Home, Package, Plus, MessageCircle, ShoppingBag, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/** The app-wide bottom bar — Home/Products/Chats/Analytics/Orders, with a
 * plus button (not a mic) as the center action. Voice capture still lives
 * inside the Add Product flow itself; this button is just the entry point
 * into it, not a replacement for it. Renders on `/` (the main entry point)
 * and every `/sell/*` page — protected links (Products/Orders/the + button)
 * just redirect to login for a guest, same as any other gated route. Six
 * items now that Analytics joined Orders — icons/labels run slightly
 * tighter than a 5-item bar to fit. */
export function SellerTabBar() {
  const t = useTranslations("nav")
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-background">
      <Link
        href="/"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px]",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Home className="size-5" />
        {t("home")}
      </Link>
      <Link
        href="/sell/products"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px]",
          pathname.startsWith("/sell/products") ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Package className="size-5" />
        {t("myCatalog")}
      </Link>

      <Link
        href="/sell/add"
        aria-label={t("myCatalog")}
        className="flex flex-1 items-center justify-center"
      >
        <span className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Plus className="size-7" />
        </span>
      </Link>

      <Link
        href="/inquiries"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px]",
          pathname.startsWith("/inquiries") ? "text-primary" : "text-muted-foreground"
        )}
      >
        <MessageCircle className="size-5" />
        {t("chats")}
      </Link>
      <Link
        href="/sell/analytics"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px]",
          pathname.startsWith("/sell/analytics") ? "text-primary" : "text-muted-foreground"
        )}
      >
        <TrendingUp className="size-5" />
        {t("analytics")}
      </Link>
      <Link
        href="/sell/orders"
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px]",
          pathname.startsWith("/sell/orders") ? "text-primary" : "text-muted-foreground"
        )}
      >
        <ShoppingBag className="size-5" />
        {t("orders")}
      </Link>
    </nav>
  )
}
