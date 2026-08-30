"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-fetch"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { ChatThread } from "@/components/messaging/chat-thread"

export function InquiryPanel({
  businessId,
  productId,
  currentUserId,
}: {
  businessId: string
  productId: string
  currentUserId: string | null
}) {
  const t = useTranslations("inquiry")
  const [inquiryId, setInquiryId] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState("")
  const [targetPrice, setTargetPrice] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [pending, setPending] = React.useState(false)

  if (!currentUserId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">Log in to send an inquiry to this business.</p>
          <Link href="/login" className={buttonVariants()}>
            Log in
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (inquiryId) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("chatTitle")}</CardTitle>
          <Link href={`/inquiries/${inquiryId}`} className="text-xs text-primary hover:underline">
            {t("callLockedHint")}
          </Link>
        </CardHeader>
        <CardContent>
          <ChatThread inquiryId={inquiryId} currentUserId={currentUserId} />
        </CardContent>
      </Card>
    )
  }

  async function submit() {
    if (!message.trim()) return
    setPending(true)
    try {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          productId,
          quantity: quantity ? Number(quantity) : undefined,
          targetPrice: targetPrice ? Number(targetPrice) : undefined,
          message,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInquiryId(data.inquiry.id)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inquiry-qty">{t("quantity")}</Label>
            <Input id="inquiry-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inquiry-price">{t("targetPrice")}</Label>
            <Input
              id="inquiry-price"
              inputMode="numeric"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inquiry-message">{t("message")}</Label>
          <textarea
            id="inquiry-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={submit} disabled={pending || !message.trim()}>
          {t("send")}
        </Button>
      </CardFooter>
    </Card>
  )
}
