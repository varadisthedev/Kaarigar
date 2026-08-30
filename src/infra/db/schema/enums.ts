import { pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", ["artisan", "buyer", "admin"])
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"])

export const otpPurposeEnum = pgEnum("otp_purpose", ["login", "phone_verify"])

export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "github"])

export const businessStatusEnum = pgEnum("business_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
])

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "published",
  "archived",
])

export const voicePurposeEnum = pgEnum("voice_purpose", [
  "business_onboarding",
  "product_catalog",
])

export const speechProviderEnum = pgEnum("speech_provider", [
  "sarvam",
  "indic_service",
  "web_speech",
])

export const pricingEngineEnum = pgEnum("pricing_engine", [
  "ml_service",
  "rules_engine",
  "gemini",
])

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "open",
  "accepted",
  "declined",
  "closed",
])

export const orderStatusEnum = pgEnum("order_status", [
  "pending_advance",
  "advance_paid",
  "in_production",
  "completed",
  "cancelled",
])

export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "paid",
  "failed",
  "refunded",
])

export const reviewActionEnum = pgEnum("review_action", [
  "approve",
  "reject",
  "request_changes",
])

export const kycProviderEnum = pgEnum("kyc_provider", ["digilocker", "offline_xml"])
