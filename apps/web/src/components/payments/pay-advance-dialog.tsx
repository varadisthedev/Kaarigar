"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { loadRazorpayCheckout } from "@/lib/load-razorpay-checkout"
import { formatInr } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const DEFAULT_ADVANCE_PERCENT = 20
const MIN_ADVANCE_PERCENT = 10
const MAX_ADVANCE_PERCENT = 50

export function PayAdvanceDialog({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations("inquiry")
  const [open, setOpen] = React.useState(false)
  const [totalAmount, setTotalAmount] = React.useState("")
  const [advancePercent, setAdvancePercent] = React.useState(DEFAULT_ADVANCE_PERCENT)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [paid, setPaid] = React.useState(false)

  const advancePreview = totalAmount ? (Number(totalAmount) * advancePercent) / 100 : 0

  async function payNow() {
    setError(null)
    const amount = Number(totalAmount)
    if (!amount || amount <= 0) return

    setPending(true)
    try {
      const orderRes = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inquiryId, totalAmount: amount, advancePercent }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        setError("Could not create the order.")
        return
      }

      const paymentRes = await apiFetch("/api/payments/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: orderData.order.id }),
      })
      const paymentData = await paymentRes.json()
      if (!paymentRes.ok) {
        setError(
          paymentData.error === "not_configured"
            ? "Payments aren't set up yet — the seller will need to add Razorpay keys first."
            : "Could not start the payment."
        )
        return
      }

      await loadRazorpayCheckout()
      const razorpay = new window.Razorpay({
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        order_id: paymentData.razorpayOrderId,
        name: "Kaarigar",
        description: "Advance payment",
        handler: () => setPaid(true),
        theme: { color: "#B8502F" },
      })
      razorpay.open()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm font-medium text-primary hover:underline">
        {t("advancePayment")}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("advancePayment")}</DialogTitle>
        <DialogDescription>{t("advanceDescription")}</DialogDescription>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="total-amount">Total amount (₹)</Label>
            <Input
              id="total-amount"
              inputMode="numeric"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              disabled={pending || paid}
            />
          </div>

          {totalAmount && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="advance-percent">{t("advanceAmount", { percent: advancePercent })}</Label>
              <Slider
                id="advance-percent"
                value={advancePercent}
                onValueChange={(v) => setAdvancePercent(Array.isArray(v) ? v[0] : v)}
                min={MIN_ADVANCE_PERCENT}
                max={MAX_ADVANCE_PERCENT}
                step={1}
                disabled={pending || paid}
              />
              <p className="text-xs text-muted-foreground">{t("advanceSliderHint")}</p>
              <p className="text-sm text-muted-foreground">
                {t("advanceAmount", { percent: advancePercent })}:{" "}
                <span className="font-medium text-foreground">{formatInr(advancePreview)}</span>
              </p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {paid && (
            <Alert variant="success">
              <AlertDescription>Payment received — confirming with the seller shortly.</AlertDescription>
            </Alert>
          )}
        </div>

        {!paid && (
          <Button className="mt-4 w-full" onClick={payNow} disabled={pending || !totalAmount}>
            {t("payNow")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
