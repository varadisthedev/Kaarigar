/** Crude, zero-latency, fully client-side "what matters in this sentence"
 * heuristic — no extra API round-trip per keystroke. Filler words and the
 * most common English/Hindi(-transliterated) stopwords are greyed out;
 * everything else (the content words — names, numbers, nouns) is
 * highlighted. It's intentionally simple: the real interpretation still
 * comes from the extractor once the utterance is final, this only drives
 * the live "what the mic is hearing" caption while recording. */
const FILLER_WORDS = new Set([
  // English fillers / stopwords
  "um", "uh", "uhh", "umm", "like", "so", "actually", "basically", "just",
  "the", "a", "an", "is", "are", "was", "were", "am", "i", "we", "my", "our",
  "and", "or", "but", "to", "of", "in", "on", "at", "for", "with", "it",
  "that", "this", "have", "has", "do", "you", "know", "well", "okay", "ok",
  // Hindi fillers / function words (romanized transcripts sometimes come
  // through Latin script from the STT provider)
  "matlab", "haan", "toh", "vo", "woh", "hai", "hain", "ka", "ki", "ke",
  "aur", "ek", "mein", "se", "bhi", "yeh", "ye",
])

export type TranscriptWord = { text: string; emphasize: boolean }

export function tokenizeTranscript(text: string): TranscriptWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({
      text: word,
      emphasize: !FILLER_WORDS.has(word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")),
    }))
}
