import "server-only"
import { features } from "@/config/env"
import type { OtpProvider } from "@/core/auth/ports"

import { msg91OtpProvider } from "./msg91.provider"
import { consoleOtpProvider } from "./console.provider"

export function getOtpProvider(): OtpProvider {
  return features.smsProvider === "msg91" ? msg91OtpProvider : consoleOtpProvider
}
