import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { oauthProviderEnum } from "./enums"
import { users } from "./users"

/**
 * One row per (provider, external account) a user has linked. Deliberately
 * separate from `users` rather than columns-on-users, so a user could link
 * both Google and GitHub to one account later without a schema change.
 * `providerAccountId` is the provider's own stable subject/user id (Google's
 * `sub`, GitHub's numeric `id`) — never the email, since email can change or
 * be reused after an account is deleted on the provider's side.
 */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("oauth_accounts_provider_account_idx").on(table.provider, table.providerAccountId)]
)

export type OAuthAccount = typeof oauthAccounts.$inferSelect
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert
