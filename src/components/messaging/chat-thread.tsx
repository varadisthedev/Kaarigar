"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Send } from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getPusherClient, inquiryChannelName } from "@/infra/messaging/pusher-client"
import type { Message } from "@/infra/db/schema"

const POLL_INTERVAL_MS = 4000

export function ChatThread({ inquiryId, currentUserId }: { inquiryId: string; currentUserId: string }) {
  const t = useTranslations("inquiry")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [draft, setDraft] = React.useState("")
  const lastTimestampRef = React.useRef<Date | undefined>(undefined)
  const listRef = React.useRef<HTMLDivElement>(null)
  const seenIdsRef = React.useRef<Set<string>>(new Set())

  function appendMessages(incoming: Message[]) {
    if (incoming.length === 0) return
    const fresh = incoming.filter((m) => !seenIdsRef.current.has(m.id))
    if (fresh.length === 0) return
    for (const m of fresh) seenIdsRef.current.add(m.id)
    setMessages((prev) => [...prev, ...fresh])
    lastTimestampRef.current = new Date(fresh[fresh.length - 1].createdAt)
  }

  const poll = React.useCallback(async () => {
    const since = lastTimestampRef.current
    const url = `/api/inquiries/${inquiryId}/messages${since ? `?since=${since.toISOString()}` : ""}`
    const res = await apiFetch(url)
    if (!res.ok) return
    const data = await res.json()
    appendMessages(data.messages)
  }, [inquiryId])

  // Load history once on mount regardless of transport.
  React.useEffect(() => {
    poll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId])

  // Real-time delivery via Pusher when configured; otherwise fall back to polling.
  React.useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) {
      const id = setInterval(() => {
        if (document.visibilityState === "visible") poll()
      }, POLL_INTERVAL_MS)
      return () => clearInterval(id)
    }

    const channel = pusher.subscribe(inquiryChannelName(inquiryId))
    const handler = (message: Message) => appendMessages([message])
    channel.bind("new-message", handler)
    return () => {
      channel.unbind("new-message", handler)
      pusher.unsubscribe(inquiryChannelName(inquiryId))
    }
  }, [inquiryId, poll])

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
      appendMessages([data.message])
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
