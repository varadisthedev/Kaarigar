"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Send,
  Paperclip,
  Mic,
  Square,
  CheckCheck,
  Phone,
  Camera,
  IndianRupee,
  Truck,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import { uploadToCloudinary } from "@/lib/cloudinary-upload"
import { useWebSpeech } from "@/hooks/use-web-speech"
import { loadRazorpayCheckout } from "@/lib/load-razorpay-checkout"
import { formatInr } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { getPusherClient, inquiryChannelName } from "@/infra/messaging/pusher-client"
import type { Message } from "@/infra/db/schema"

const POLL_INTERVAL_MS = 4000
const IMAGE_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/.+\.(jpe?g|png|webp|gif)$/i
const PAYMENT_LINK_PATTERN = /^\[PAYMENT_LINK:([0-9.]+):([^:]+):?([^\]]*)\]$/

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?"
}

export function ChatThread({
  inquiryId,
  currentUserId,
  otherPartyName,
  otherPartyAvatarUrl,
  canQuickAct,
}: {
  inquiryId: string
  currentUserId: string
  otherPartyName: string
  otherPartyAvatarUrl?: string | null
  canQuickAct: boolean
}) {
  const t = useTranslations("inquiry")
  const locale = useLocale() as "en" | "hi" | "mr"
  const [messages, setMessages] = React.useState<Message[]>([])
  const [draft, setDraft] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const lastTimestampRef = React.useRef<Date | undefined>(undefined)
  const listRef = React.useRef<HTMLDivElement>(null)
  const seenIdsRef = React.useRef<Set<string>>(new Set())
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Phone Number Modal State
  const [phoneModalOpen, setPhoneModalOpen] = React.useState(false)
  const [phoneNumber, setPhoneNumber] = React.useState<string | null>(null)
  const [phoneLoading, setPhoneLoading] = React.useState(false)
  const [copiedPhone, setCopiedPhone] = React.useState(false)

  // Payment Link Generator Modal State
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false)
  const [paymentAmount, setPaymentAmount] = React.useState("")
  const [paymentDesc, setPaymentDesc] = React.useState("")
  const [paymentGenerating, setPaymentGenerating] = React.useState(false)
  const [payingOrderId, setPayingOrderId] = React.useState<string | null>(null)

  const speech = useWebSpeech(locale, (fullText) => setDraft(fullText))

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

  React.useEffect(() => {
    poll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId])

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

  async function sendBody(body: string) {
    if (!body.trim()) return
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

  async function send() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    await sendBody(body)
  }

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await uploadToCloudinary(file, "chat_photo")
      await sendBody(uploaded.url)
    } catch {
      // Non-critical upload retry
    } finally {
      setUploading(false)
    }
  }

  async function toggleMic() {
    if (speech.isListening) {
      speech.stop()
      return
    }
    try {
      await speech.start()
    } catch {
      // Idle on permission block
    }
  }

  function quickMessage(key: "quickMessagePhotos" | "quickMessagePrice" | "quickMessageDelivery") {
    setDraft(t(key))
  }

  async function handleViewPhone() {
    setPhoneLoading(true)
    setPhoneModalOpen(true)
    try {
      const res = await apiFetch(`/api/inquiries/${inquiryId}/phone`)
      const data = await res.json()
      if (res.ok && data.phoneE164) {
        setPhoneNumber(data.phoneE164)
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  function copyPhoneNumber() {
    if (!phoneNumber) return
    navigator.clipboard.writeText(phoneNumber)
    setCopiedPhone(true)
    toast.success("Phone number copied to clipboard!")
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  async function handleGeneratePaymentLink() {
    const amountNum = Number(paymentAmount)
    if (!amountNum || amountNum <= 0) return
    setPaymentGenerating(true)
    try {
      const res = await apiFetch("/api/payments/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          amount: amountNum,
          description: paymentDesc || undefined,
        }),
      })
      if (res.ok) {
        setPaymentModalOpen(false)
        setPaymentAmount("")
        setPaymentDesc("")
        toast.success("Razorpay payment link created!", `Amount: ${formatInr(amountNum)} · Valid for 30 days`)
        poll()
      } else {
        toast.error("Could not create payment link. Please try again.")
      }
    } catch {
      toast.error("Payment link creation failed.")
    } finally {
      setPaymentGenerating(false)
    }
  }

  async function handlePayOrder(orderId: string, amount: number) {
    setPayingOrderId(orderId)
    try {
      const paymentRes = await apiFetch("/api/payments/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const paymentData = await paymentRes.json()
      if (!paymentRes.ok) {
        alert(paymentData.error === "not_configured" ? "Razorpay test mode active." : "Could not initiate payment.")
        return
      }

      await loadRazorpayCheckout()
      const razorpay = new window.Razorpay({
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        order_id: paymentData.razorpayOrderId,
        name: "Kaarigar",
        description: `Order Payment (${formatInr(amount)})`,
        handler: async () => {
          await sendBody(`✅ Payment of ${formatInr(amount)} completed successfully!`)
          poll()
        },
        theme: { color: "#059669" },
      })
      razorpay.open()
    } catch (e) {
      console.warn("[chat-thread] Checkout error:", e)
    } finally {
      setPayingOrderId(null)
    }
  }

  const dayLabel = React.useCallback(
    (date: Date) => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      if (date.toDateString() === today.toDateString()) return t("today")
      if (date.toDateString() === yesterday.toDateString()) return t("yesterday")
      return date.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" })
    },
    [t, locale]
  )

  let lastDay: string | null = null

  return (
    <div className="flex flex-col border border-border bg-card rounded-xl overflow-hidden shadow-xs">
      <div ref={listRef} className="flex max-h-[30rem] min-h-[18rem] flex-col gap-3.5 overflow-y-auto p-4 sm:p-5">
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId
          const created = new Date(m.createdAt)
          const thisDay = created.toDateString()
          const showDivider = thisDay !== lastDay
          lastDay = thisDay
          const isImage = IMAGE_URL_PATTERN.test(m.body)
          const paymentMatch = m.body.match(PAYMENT_LINK_PATTERN)
          const time = created.toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", {
            hour: "numeric",
            minute: "2-digit",
          })

          return (
            <React.Fragment key={m.id}>
              {showDivider && (
                <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  {dayLabel(created)}
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className={cn("flex max-w-[90%] sm:max-w-[85%] flex-col gap-1", isMine ? "ml-auto items-end" : "items-start")}>
                {!isMine && (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      {otherPartyAvatarUrl && <AvatarImage src={otherPartyAvatarUrl} alt={otherPartyName} />}
                      <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-bold">
                        {initials(otherPartyName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-foreground">{otherPartyName}</span>
                  </div>
                )}

                {paymentMatch ? (
                  // Interactive In-Chat Razorpay Payment Card
                  <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm shadow-xs">
                    <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
                      <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Razorpay Payment Request</span>
                    </div>
                    {paymentMatch[3] && (
                      <p className="text-xs text-muted-foreground">{decodeURIComponent(paymentMatch[3])}</p>
                    )}
                    <div className="flex items-baseline gap-1 text-lg font-bold text-foreground">
                      <span>{formatInr(Number(paymentMatch[1]))}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(Valid up to 30 days)</span>
                    </div>
                    {!isMine && (
                      <Button
                        size="sm"
                        onClick={() => handlePayOrder(paymentMatch[2], Number(paymentMatch[1]))}
                        disabled={payingOrderId === paymentMatch[2]}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5"
                      >
                        {payingOrderId === paymentMatch[2] ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="size-4" />
                        )}
                        Pay {formatInr(Number(paymentMatch[1]))} Now
                      </Button>
                    )}
                  </div>
                ) : isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.body} alt="" className="max-w-64 rounded-lg border border-border object-cover" />
                ) : (
                  <div
                    className={cn(
                      "px-3.5 py-2.5 text-sm sm:text-base leading-relaxed rounded-2xl",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-xs shadow-xs"
                        : "bg-secondary text-secondary-foreground rounded-bl-xs border border-border"
                    )}
                  >
                    {m.body}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {!isMine && <span>{otherPartyName}</span>}
                  {isMine && <span>{t("you")}</span>}
                  <span>·</span>
                  <span>{time}</span>
                  {isMine && <CheckCheck className="size-3.5 text-primary" />}
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* Action Toolbar */}
      {canQuickAct && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/30 px-4 py-2.5">
          <Button type="button" size="sm" variant="outline" className="rounded-full h-8 text-xs gap-1.5" onClick={handleViewPhone}>
            <Phone className="size-3.5 text-primary" /> {t("call")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-8 text-xs gap-1.5"
            onClick={() => setPaymentModalOpen(true)}
          >
            <IndianRupee className="size-3.5 text-emerald-600" /> Create Payment Link
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-8 text-xs gap-1.5"
            onClick={() => quickMessage("quickMessagePhotos")}
          >
            <Camera className="size-3.5" /> {t("requestPhotos")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-8 text-xs gap-1.5"
            onClick={() => quickMessage("quickMessageDelivery")}
          >
            <Truck className="size-3.5" /> {t("askAboutDelivery")}
          </Button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2 border-t border-border p-3">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAttach} />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t("attachPhoto")}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="size-10"
        >
          <Paperclip className="size-4" />
        </Button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={speech.isListening ? t("listening") : t("messagePlaceholder")}
          className="h-10 text-sm sm:text-base flex-1"
        />
        <Button
          type="button"
          size="icon"
          variant={speech.isListening ? "default" : "ghost"}
          aria-label={t("recordVoice")}
          onClick={toggleMic}
          className="size-10"
        >
          {speech.isListening ? <Square className="size-4" /> : <Mic className="size-4" />}
        </Button>
        <Button size="icon" onClick={send} aria-label={t("send")} className="size-10">
          <Send className="size-4" />
        </Button>
      </div>

      {/* Phone Number Display Modal */}
      <Dialog open={phoneModalOpen} onOpenChange={setPhoneModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-5 text-primary" />
            <span>Contact {otherPartyName}</span>
          </DialogTitle>
          <DialogDescription>
            Direct contact number for inquiries and orders.
          </DialogDescription>
          <div className="mt-4 flex flex-col gap-4">
            {phoneLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : phoneNumber ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Phone Number</span>
                    <span className="text-lg font-bold tracking-wide text-foreground">{phoneNumber}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={copyPhoneNumber} className="gap-1.5 text-xs">
                    {copiedPhone ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    {copiedPhone ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${phoneNumber}`}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Phone className="size-4" /> Call via Phone
                  </a>
                  <a
                    href={`https://wa.me/${phoneNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <ExternalLink className="size-4" /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">Phone number is not available for this user.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Razorpay Payment Link Generator Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-emerald-600" />
            <span>Create Razorpay Payment Link</span>
          </DialogTitle>
          <DialogDescription>
            Generates a secure Razorpay payment link with maximum (30-day) expiry and posts it into this chat.
          </DialogDescription>
          <div className="mt-4 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-amt" className="text-xs font-medium">Payment Amount (₹)</Label>
              <Input
                id="pay-amt"
                inputMode="numeric"
                placeholder="e.g. 5000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-11 text-base font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-desc" className="text-xs font-medium">Order Description (Optional)</Label>
              <Input
                id="pay-desc"
                placeholder="e.g. Advance payment for 10 handwoven sarees"
                value={paymentDesc}
                onChange={(e) => setPaymentDesc(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Link will remain active for 30 days. Payments are securely captured by Razorpay and updated on your dashboard.
            </p>
            <Button
              className="mt-2 h-11 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleGeneratePaymentLink}
              disabled={paymentGenerating || !paymentAmount || Number(paymentAmount) <= 0}
            >
              {paymentGenerating ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="mr-1.5 size-4" />}
              Generate & Send Payment Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
