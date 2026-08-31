"use client"

import { useTranslations } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const t = useTranslations("nav")
  const router = useRouter()

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      {t("logout")}
    </Button>
  )
}
