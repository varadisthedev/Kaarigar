import "server-only"
import type { OtpProvider } from "@/core/auth/ports"
import { features } from "@/config/env"

import { consoleOtpProvider } from "./console.provider"
import { twilioOtpProvider } from "./twilio.provider"

export function getOtpProvider(): OtpProvider {
  if (features.smsProvider === "twilio") return twilioOtpProvider
  return consoleOtpProvider
}