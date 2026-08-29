import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { getCurrentUser } from "@/infra/http/current-user"
import { buttonVariants } from "@/components/ui/button"
import { LanguageSwitcher } from "./language-switcher"
import { cn } from "@/lib/utils"

export async function SiteHeader() {
  const t = await getTranslations("nav")
  const user = await getCurrentUser()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-lg font-medium text-foreground">
          CraftMate
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/marketplace" className="text-foreground/80 hover:text-foreground">
            {t("marketplace")}
          </Link>
          <Link href="/sell" className="text-foreground/80 hover:text-foreground">
            {t("sell")}
          </Link>
          {user && (
            <Link href="/inquiries" className="text-foreground/80 hover:text-foreground">
              {t("inquiries")}
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="text-foreground/80 hover:text-foreground">
              {t("admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href={user ? "/account" : "/login"}
            className={cn(buttonVariants({ variant: user ? "outline" : "default", size: "sm" }), "hidden md:inline-flex")}
          >
            {user ? t("account") : t("login")}
          </Link>
        </div>
      </div>
    </header>
  )
}
