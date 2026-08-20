import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./config/env";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient
}

const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
})

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({
    adapter: adapter,
})

if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma
