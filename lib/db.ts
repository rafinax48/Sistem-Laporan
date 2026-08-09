import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function sqliteFilePath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
  const withoutPrefix = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  return path.resolve(withoutPrefix);
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaBetterSqlite3({ url: sqliteFilePath() });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
