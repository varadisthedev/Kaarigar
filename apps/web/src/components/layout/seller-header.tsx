import Image from "next/image"
import { Bell } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SellerNavDrawer } from "./seller-nav-drawer"
import { LanguageSwitcher } from "./language-switcher"
import type { AccessTokenPayload } from "@/core/auth/jwt"

/**
 * This is now the app-wide header — it renders on `/` (the main entry
 * point, reachable by anyone) as well as every `/sell/*` page, so `user`
 * must be optional: a guest sees a "Log in" link where the avatar would be,
 * no notification bell (there's nothing to notify an anonymous visitor
 * about), and a trimmed nav drawer. The compact language switcher sits
 * directly in the bar — not tucked inside the drawer, and visually
 * highlighted (pulsing dot, tinted pill) — since this is the first thing a
 * low-literacy visitor needs to find.
 */
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
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <SellerNavDrawer role={user?.role ?? null} />
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand-icon.png" alt="" width={176} height={160} priority className="h-9 w-auto sm:h-10" />
            <div className="flex flex-col leading-none">
              <span className="font-heading text-lg font-semibold text-foreground">Kaarigar</span>
              <span className="hidden text-[11px] text-muted-foreground sm:inline">{tagline}</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {user && (
            <button
              type="button"
              aria-label="Notifications"
              className="flex size-11 items-center justify-center text-foreground/70 hover:text-foreground"
            >
              <Bell className="size-5" />
            </button>
          )}
          {user ? (
            <Link href="/account">
              <Avatar className="size-10 border border-border">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? ""} />}
                <AvatarFallback>{(name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              {loginLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
