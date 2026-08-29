import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core"

import { inquiryStatusEnum, orderStatusEnum, paymentStatusEnum } from "./enums"
import { users } from "./users"
import { businesses } from "./business"
import { products } from "./catalog"

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 10, scale: 2 }),
    targetPrice: numeric("target_price", { precision: 10, scale: 2 }),
    message: text("message"),
    status: inquiryStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inquiries_business_id_idx").on(table.businessId),
    index("inquiries_buyer_id_idx").on(table.buyerId),
  ]
)

/**
 * Polling-based transport for the MVP (`GET .../messages?since=`, ~4s
 * interval). Behind `core/messaging`'s `MessagingTransport` port so a
 * real-time driver (Pusher/Ably) is a later adapter swap, not a rewrite —
 * and polling is what React Native gets too, so behavior stays identical.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_inquiry_id_created_at_idx").on(table.inquiryId, table.createdAt)]
)

/** `advancePercent` is stored per order (not hardcoded) so 10% stays tunable. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "restrict" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    advancePercent: numeric("advance_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("10"),
    advanceAmount: numeric("advance_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending_advance"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("orders_business_id_idx").on(table.businessId)]
)

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
    razorpaySignature: text("razorpay_signature"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 6 }).notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("created"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payments_order_id_idx").on(table.orderId)]
)

export type Inquiry = typeof inquiries.$inferSelect
export type NewInquiry = typeof inquiries.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
