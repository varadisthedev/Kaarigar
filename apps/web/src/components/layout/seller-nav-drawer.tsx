"use client"

import * as React from "react"
import { Menu, Store, Package, Sparkles, MessageCircle, TrendingUp, ShoppingBag, User, Shield, Building2, LogIn } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { LanguageSwitcher } from "./language-switcher"
import { LogoutButton } from "@/components/account/logout-button"
import { cn } from "@/lib/utils"

export function SellerNavDrawer({
  role,
  isTerracotta = false,
}: {
  role: "artisan" | "buyer" | "admin" | null
  isTerracotta?: boolean
}) {
  const t = useTranslations("nav")
  const [open, setOpen] = React.useState(false)

  // A guest gets Home + Marketplace + Log in — nothing that just bounces
  // them straight to /login anyway. A signed-in user gets the full seller
  // toolset, since / doubles as both the public entry point and the
  // dashboard now.
  const links = role
    ? [
        { href: "/", label: t("home"), icon: Store },
        { href: "/marketplace", label: t("marketplace"), icon: Store },
        { href: "/sell/businesses", label: t("myBusinesses"), icon: Building2 },
        { href: "/sell/products", label: t("myCatalog"), icon: Package },
        { href: "/sell/price-check", label: t("checkPrice"), icon: Sparkles },
        { href: "/sell/analytics", label: t("analytics"), icon: TrendingUp },
        { href: "/sell/orders", label: t("orders"), icon: ShoppingBag },
        { href: "/inquiries", label: t("chats"), icon: MessageCircle },
        { href: "/account", label: t("account"), icon: User },
      ]
    : [
        { href: "/", label: t("home"), icon: Store },
        { href: "/marketplace", label: t("marketplace"), icon: Store },
      ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("menu")}
        className={cn(
          "flex size-10 items-center justify-center rounded-full transition-colors",
          isTerracotta
            ? "text-white hover:bg-white/10"
            : "text-foreground hover:bg-secondary"
        )}
      >
        <Menu className="size-5.5 sm:size-6" />
      </SheetTrigger>
      <SheetContent>
        <div className="flex flex-col gap-1 border-b border-border p-4">
          <SheetTitle>{t("menu")}</SheetTitle>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center gap-3 px-2 text-sm text-foreground hover:bg-secondary"
              >
                <Icon className="size-4.5 text-muted-foreground" />
                {link.label}
              </Link>
            )
          })}
          {role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-3 px-2 text-sm text-foreground hover:bg-secondary"
            >
              <Shield className="size-4.5 text-muted-foreground" />
              {t("admin")}
            </Link>
          )}
          {!role && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-3 px-2 text-sm text-foreground hover:bg-secondary"
            >
              <LogIn className="size-4.5 text-muted-foreground" />
              {t("login")}
            </Link>
          )}
        </nav>

        <Separator />

        <div className="p-4">
          <LanguageSwitcher variant="full" />
        </div>

        {role && (
          <>
            <Separator />
            <div className="mt-auto p-4">
              <LogoutButton />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
