import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

declare global { var _prisma: PrismaClient | undefined; }

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalThis._prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis._prisma = prisma;
