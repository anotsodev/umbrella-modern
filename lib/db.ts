import { PrismaClient } from "@prisma/client";

// Singleton pattern: Next.js dev mode hot-reloads modules, which would
// create a new PrismaClient on every reload and exhaust the Postgres
// connection pool. Cache on globalThis to keep one client per process.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
