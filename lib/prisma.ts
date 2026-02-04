// IMPORT IMPORTANCE: Point to 'client', not 'index.js'
import { PrismaClient } from "../generated/client/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// 1. Create the Pool and Adapter
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// 2. Singleton Function
const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

// 3. Global Object Handling (prevents hot-reload crashes)
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

