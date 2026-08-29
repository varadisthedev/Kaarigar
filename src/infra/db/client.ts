import "server-only"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import { env, features } from "@/config/env"
import * as schema from "./schema"

/**
 * Lazily created so the app can boot (and static/UI-only pages render) with
 * no DATABASE_URL configured — the moment code actually tries to query, it
 * gets one clear error instead of every import site needing its own guard.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (_db) return _db

  if (!features.database) {
    throw new Error(
      "DATABASE_URL is not set. Create a Neon project at https://neon.tech, " +
        "then add DATABASE_URL to .env.local before using any database feature."
    )
  }

  const sql = neon(env.DATABASE_URL!)
  _db = drizzle(sql, { schema })
  return _db
}

export type Db = ReturnType<typeof getDb>
