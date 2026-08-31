import { useTranslations } from "next-intl"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}

// This lucide-react version dropped brand/logo icons (only generic
// git-branch-style glyphs remain) — the standard GitHub mark, inlined.
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-foreground" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

/**
 * Additive to phone/OTP — not a replacement. Full-page `<a>` links (not
 * fetch calls) since starting OAuth requires an actual browser navigation
 * to Google/GitHub's consent screen. If a provider's keys aren't configured
 * yet, the link still works — /start redirects straight back here with
 * `oauthError=not_configured` rather than 404ing or doing nothing.
 */
export function OAuthButtons({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations("auth")

  const qs = new URLSearchParams({ locale, next }).toString()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t("or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <a
        href={`/api/auth/oauth/google/start?${qs}`}
        className="flex h-11 items-center justify-center gap-2.5 border border-input bg-background text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <GoogleIcon />
        {t("continueWithGoogle")}
      </a>
      <a
        href={`/api/auth/oauth/github/start?${qs}`}
        className="flex h-11 items-center justify-center gap-2.5 border border-input bg-background text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <GithubIcon />
        {t("continueWithGithub")}
      </a>
    </div>
  )
}
