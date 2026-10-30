import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production');
  process.env.DATABASE_URL = 'postgresql://nexora:nexora@localhost:5432/nexora?schema=public';
}

const globalPrisma = globalThis as unknown as { nexoraPrisma?: PrismaClient };

export const prisma =
  globalPrisma.nexoraPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalPrisma.nexoraPrisma = prisma;
