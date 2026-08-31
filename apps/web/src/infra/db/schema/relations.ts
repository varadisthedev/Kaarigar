import { relations } from "drizzle-orm"

import { users } from "./users"
import { sessions } from "./auth"
import { businesses, businessMedia } from "./business"
import { products, productMedia, productLikes } from "./catalog"
import { productViewsDaily } from "./analytics"
import { voiceSessions } from "./voice"
import { priceSuggestions } from "./pricing"
import { inquiries, messages, orders, payments } from "./marketplace"
import { reviewActions, auditLog } from "./admin"
import { kycDocuments } from "./kyc"
import { oauthAccounts } from "./oauth"

// All cross-table `relations()` wiring lives here, in one file, imported
// after every table module has already been evaluated — this is what lets
// tables reference each other (users <-> businesses <-> sessions, etc.)
// without a circular-import ordering bug.

export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
  sessions: many(sessions),
  sentMessages: many(messages),
  buyerInquiries: many(inquiries),
  kycDocuments: many(kycDocuments),
  auditLogEntries: many(auditLog),
  oauthAccounts: many(oauthAccounts),
  productLikes: many(productLikes),
}))

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  reviewedByAdmin: one(users, { fields: [businesses.reviewedBy], references: [users.id] }),
  media: many(businessMedia),
  products: many(products),
  inquiries: many(inquiries),
  orders: many(orders),
  reviewActions: many(reviewActions),
  voiceSessions: many(voiceSessions),
}))

export const businessMediaRelations = relations(businessMedia, ({ one }) => ({
  business: one(businesses, { fields: [businessMedia.businessId], references: [businesses.id] }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  business: one(businesses, { fields: [products.businessId], references: [businesses.id] }),
  media: many(productMedia),
  inquiries: many(inquiries),
  priceSuggestions: many(priceSuggestions),
  likes: many(productLikes),
  viewsDaily: many(productViewsDaily),
}))

export const productViewsDailyRelations = relations(productViewsDaily, ({ one }) => ({
  product: one(products, { fields: [productViewsDaily.productId], references: [products.id] }),
  business: one(businesses, { fields: [productViewsDaily.businessId], references: [businesses.id] }),
}))

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] }),
}))

export const productLikesRelations = relations(productLikes, ({ one }) => ({
  product: one(products, { fields: [productLikes.productId], references: [products.id] }),
  user: one(users, { fields: [productLikes.userId], references: [users.id] }),
}))

export const voiceSessionsRelations = relations(voiceSessions, ({ one }) => ({
  user: one(users, { fields: [voiceSessions.userId], references: [users.id] }),
  business: one(businesses, { fields: [voiceSessions.businessId], references: [businesses.id] }),
}))

export const priceSuggestionsRelations = relations(priceSuggestions, ({ one }) => ({
  product: one(products, { fields: [priceSuggestions.productId], references: [products.id] }),
}))

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  business: one(businesses, { fields: [inquiries.businessId], references: [businesses.id] }),
  product: one(products, { fields: [inquiries.productId], references: [products.id] }),
  buyer: one(users, { fields: [inquiries.buyerId], references: [users.id] }),
  messages: many(messages),
  orders: many(orders),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  inquiry: one(inquiries, { fields: [messages.inquiryId], references: [inquiries.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  inquiry: one(inquiries, { fields: [orders.inquiryId], references: [inquiries.id] }),
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  business: one(businesses, { fields: [orders.businessId], references: [businesses.id] }),
  payments: many(payments),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}))

export const reviewActionsRelations = relations(reviewActions, ({ one }) => ({
  business: one(businesses, { fields: [reviewActions.businessId], references: [businesses.id] }),
  admin: one(users, { fields: [reviewActions.adminId], references: [users.id] }),
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, { fields: [auditLog.actorId], references: [users.id] }),
}))

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, { fields: [kycDocuments.userId], references: [users.id] }),
}))
