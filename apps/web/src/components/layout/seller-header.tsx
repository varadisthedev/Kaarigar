"use client"

import * as React from "react"
import Image from "next/image"
import { Bell, Store, Package, MessageCircle, ShoppingBag, Sparkles, LayoutDashboard } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SellerNavDrawer } from "./seller-nav-drawer"
import { LanguageSwitcher } from "./language-switcher"
import type { AccessTokenPayload } from "@/core/auth/jwt"
import { cn } from "@/lib/utils"

export function SellerHeader({
  user,
  name,
  avatarUrl,
  tagline,
  loginLabel,
}: {
  user: AccessTokenPayload | null
  name: string | null
  avatarUrl: string | null
  tagline: string
  loginLabel: string
}) {
  const t = useTranslations("nav")
  const pathname = usePathname()

  // Determine the active notched center card based on current route
  const getActiveTabInfo = () => {
    if (pathname.startsWith("/marketplace")) {
      return { label: t("marketplace"), icon: Store, href: "/marketplace" }
    }
    if (pathname.startsWith("/sell/products") || pathname.startsWith("/sell/add")) {
      return { label: t("myCatalog"), icon: Package, href: "/sell/products" }
    }
    if (pathname.startsWith("/sell/orders") || pathname.startsWith("/orders")) {
      return { label: t("orders"), icon: ShoppingBag, href: user ? "/sell/orders" : "/orders" }
    }
    if (pathname.startsWith("/inquiries")) {
      return { label: t("chats"), icon: MessageCircle, href: "/inquiries" }
    }
    if (pathname.startsWith("/sell")) {
      return { label: t("sell"), icon: Sparkles, href: "/sell" }
    }
    return { label: t("home"), icon: LayoutDashboard, href: "/" }
  }

  const activeTab = getActiveTabInfo()

  return (
    <header className="sticky top-0 z-40 w-full px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="relative mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#BA4F2D] via-[#B34726] to-[#993414] px-3 shadow-lg ring-1 ring-black/10 sm:rounded-3xl sm:px-6">
        
        {/* Bottom Warli Artisan Pattern Band */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 w-full opacity-40 mix-blend-screen bg-repeat-x bg-bottom"
          style={{
            backgroundImage: "url('/people.png')",
            backgroundSize: "auto 14px",
          }}
          aria-hidden="true"
        />

        {/* Left Branding Section */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
          <SellerNavDrawer role={user?.role ?? null} isTerracotta />
          
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-95">
            <div className="relative flex size-10 items-center justify-center sm:size-11">
              <Image
                src="/artisan-figure.png"
                alt="Kaarigar Artisans"
                width={160}
                height={160}
                priority
                className="h-9 w-auto object-contain brightness-0 invert drop-shadow-sm sm:h-10"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-lg font-bold tracking-wide text-white sm:text-xl">
                Kaarigar
              </span>
              <span className="hidden text-[10.5px] font-medium text-amber-100/90 lg:inline">
                {tagline}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Active Notched Tab Card (Inspired by Design) */}
        <div className="absolute left-1/2 bottom-0 z-10 hidden -translate-x-1/2 md:block">
          <Link
            href={activeTab.href}
            className="group relative flex flex-col items-center justify-end rounded-t-2xl border-t border-x border-amber-200/50 bg-[#FFFDF9] px-6 pt-2 pb-1 shadow-md transition-transform hover:-translate-y-0.5"
          >
            {/* Small Decorative Craft Sun/Mandala Motif */}
            <div className="flex items-center gap-1 text-[10px] text-amber-700/80 font-bold tracking-wider uppercase">
              <span className="inline-block size-1 rounded-full bg-amber-600" />
              <span>✦</span>
              <span className="inline-block size-1 rounded-full bg-amber-600" />
            </div>

            {/* Active Tab Label with Icon */}
            <div className="mt-0.5 flex items-center gap-2 text-stone-900">
              <activeTab.icon className="size-4 text-[#B34726]" />
              <span className="font-heading text-sm font-bold tracking-tight text-stone-900">
                {activeTab.label}
              </span>
            </div>

            {/* Bottom mini Warli tribal strip inside the active tab */}
            <div
              className="pointer-events-none mt-1 h-2 w-full opacity-60 bg-repeat-x bg-bottom"
              style={{
                backgroundImage: "url('/people.png')",
                backgroundSize: "auto 8px",
              }}
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Right Section: Navigation Shortcuts, Language, Bell & Profile */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
          {/* Quick Links on desktop */}
          <nav className="hidden items-center gap-3 text-sm font-medium text-white/90 xl:flex">
            <Link
              href="/marketplace"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors hover:bg-white/10 hover:text-white",
                pathname.startsWith("/marketplace") && "bg-white/15 text-white font-semibold"
              )}
            >
              <Store className="size-4" />
              <span>{t("marketplace")}</span>
            </Link>

            <span className="text-white/30">|</span>

            <Link
              href="/sell"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors hover:bg-white/10 hover:text-white",
                pathname.startsWith("/sell") && "bg-white/15 text-white font-semibold"
              )}
            >
              <Sparkles className="size-4" />
              <span>{t("sell")}</span>
            </Link>

            {user && (
              <>
                <span className="text-white/30">|</span>
                <Link
                  href="/inquiries"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors hover:bg-white/10 hover:text-white",
                    pathname.startsWith("/inquiries") && "bg-white/15 text-white font-semibold"
                  )}
                >
                  <MessageCircle className="size-4" />
                  <span>{t("chats")}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Integrated Terracotta Language Switcher */}
          <LanguageSwitcher isNavbar />

          {/* Notifications Bell (signed in) */}
          {user && (
            <button
              type="button"
              aria-label="Notifications"
              className="flex size-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:size-10"
            >
              <Bell className="size-4.5 sm:size-5" />
            </button>
          )}

          {/* Profile Avatar / Log in */}
          {user ? (
            <Link href="/account" className="transition-transform hover:scale-105">
              <Avatar className="size-9 border-2 border-white/90 bg-white shadow-sm sm:size-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? ""} />}
                <AvatarFallback className="bg-white font-heading font-bold text-[#B34726]">
                  {(name ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center rounded-full bg-white px-4 text-xs font-bold text-[#B34726] shadow-sm transition-all hover:bg-amber-50 hover:shadow sm:h-10 sm:px-5 sm:text-sm"
            >
              {loginLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
