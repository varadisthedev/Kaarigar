"use client"

import { useTranslations } from "next-intl"

import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Button } from "@/components/ui/button"

export function LanguageStep({ onContinue }: { onContinue: () => void }) {
  const t = useTranslations("onboarding")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-medium text-foreground">{t("languageStepTitle")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("languageStepSubtitle")}</p>
      </div>
      <LanguageSwitcher variant="full" />
      <Button className="w-full" onClick={onContinue}>
        {t("languageStepContinue")}
      </Button>
    </div>
  )
}
