"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { apiFetch } from "@/lib/api-fetch"
import { loadRazorpayCheckout } from "@/lib/load-razorpay-checkout"
import { formatInr } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function PayAdvanceDialog({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations("inquiry")
  const [open, setOpen] = React.useState(false)
  const [totalAmount, setTotalAmount] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [paid, setPaid] = React.useState(false)

  const advancePreview = totalAmount ? Number(totalAmount) * 0.1 : 0

  async function payNow() {
    setError(null)
    const amount = Number(totalAmount)
    if (!amount || amount <= 0) return

    setPending(true)
    try {
      const orderRes = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inquiryId, totalAmount: amount }),
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
        name: "CraftMate",
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
        <DialogDescription>
          Enter the total amount you&rsquo;ve agreed on — you&rsquo;ll pay a 10% advance now.
        </DialogDescription>

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
            <p className="text-sm text-muted-foreground">
              {t("advanceAmount", { percent: 10 })}: <span className="font-medium text-foreground">{formatInr(advancePreview)}</span>
            </p>
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
