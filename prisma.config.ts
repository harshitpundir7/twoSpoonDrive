import { defineConfig } from "prisma/config"
import { config } from "dotenv"

// Load environment variables from .env file
config()

// DATABASE_URL is required for migrations and runtime
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Using placeholder for client generation.\n" +
    "   Set DATABASE_URL in your .env file to run migrations.\n" +
    "   Example: DATABASE_URL='postgresql://user:password@localhost:5432/mydb'"
  )
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use placeholder only if DATABASE_URL is not set (for client generation)
    // This will fail for migrations, which is expected
    url: databaseUrl || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
})

