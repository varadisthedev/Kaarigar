import { tokenizeTranscript } from "@/lib/transcript-highlight"

/** `tone="onPrimary"` for use inside the primary-colored "user" chat bubble
 * (the confirmed/pending-confirmation transcript); `tone="onLight"` for the
 * live-caption side panel, which sits on the page's normal background. */
export function HighlightedTranscript({ text, tone = "onPrimary" }: { text: string; tone?: "onPrimary" | "onLight" }) {
  const words = tokenizeTranscript(text)
  const emphasizeClass = tone === "onPrimary" ? "font-semibold text-primary-foreground" : "font-semibold text-foreground"
  const mutedClass = tone === "onPrimary" ? "text-primary-foreground/55" : "text-muted-foreground/50"
  return (
    <span>
      {words.map((w, i) => (
        <span key={i} className={w.emphasize ? emphasizeClass : mutedClass}>
          {w.text}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  )
}
