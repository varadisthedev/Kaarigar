"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Send } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Message } from "@/infra/db/schema"

const POLL_INTERVAL_MS = 4000

export function ChatThread({ inquiryId, currentUserId }: { inquiryId: string; currentUserId: string }) {
  const t = useTranslations("inquiry")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [draft, setDraft] = React.useState("")
  const lastTimestampRef = React.useRef<Date | undefined>(undefined)
  const listRef = React.useRef<HTMLDivElement>(null)

  const poll = React.useCallback(async () => {
    const since = lastTimestampRef.current
    const url = `/api/inquiries/${inquiryId}/messages${since ? `?since=${since.toISOString()}` : ""}`
    const res = await apiFetch(url)
    if (!res.ok) return
    const data = await res.json()
    if (data.messages.length > 0) {
      setMessages((prev) => [...prev, ...data.messages])
      lastTimestampRef.current = new Date(data.messages[data.messages.length - 1].createdAt)
    }
  }, [inquiryId])

  React.useEffect(() => {
    poll()
    const id = setInterval(() => {
      if (document.visibilityState === "visible") poll()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [poll])

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    const res = await apiFetch(`/api/inquiries/${inquiryId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    })
    if (res.ok) {
      const data = await res.json()
      setMessages((prev) => [...prev, data.message])
      lastTimestampRef.current = new Date(data.message.createdAt)
    }
  }

  return (
    <div className="flex flex-col border border-border">
      <div ref={listRef} className="flex max-h-80 flex-col gap-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] px-3 py-1.5 text-sm",
              m.senderId === currentUserId
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-secondary text-secondary-foreground"
            )}
          >
            {m.body}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("messagePlaceholder")}
        />
        <Button size="icon" onClick={send} aria-label={t("send")}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
