import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set — add it to .env.local first.")
  }
  const db = drizzle(neon(url))
  await migrate(db, { migrationsFolder: "./src/infra/db/migrations" })
  console.log("[migrate] done.")
}

main().catch((err) => {
  console.error("[migrate] failed:", err)
  process.exit(1)
})
