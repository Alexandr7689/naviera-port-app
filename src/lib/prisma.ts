import { PrismaClient } from '@prisma/client';
import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      '[Prisma] DATABASE_URL no está definida. Verifica las variables de entorno.'
    );
  }

  // HTTP adapter es el recomendado para entornos serverless (Vercel, Edge)
  // No requiere WebSockets ni el módulo 'ws'
  const sql = neon(connectionString);
  const adapter = new PrismaNeonHTTP(sql as any);
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
