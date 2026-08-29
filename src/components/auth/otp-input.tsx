"use client"

import * as React from "react"

import { OTPField, OTPFieldInput } from "@/components/ui/otp-field"
import { cn } from "@/lib/utils"

const LENGTH = 6

export function OtpInput({
  onComplete,
  disabled,
  invalid,
  autoFocus = true,
}: {
  onComplete: (code: string) => void
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
}) {
  const [value, setValue] = React.useState("")

  return (
    <OTPField
      length={LENGTH}
      value={value}
      autoComplete="one-time-code"
      disabled={disabled}
      onValueChange={(next) => setValue(next)}
      onValueComplete={(code) => onComplete(code)}
      className={cn("justify-center")}
    >
      {Array.from({ length: LENGTH }).map((_, i) => (
        <OTPFieldInput
          key={i}
          aria-invalid={invalid}
          autoFocus={autoFocus && i === 0}
        />
      ))}
    </OTPField>
  )
}
