import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
})

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({
    adapter: adapter,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
