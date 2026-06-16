import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

// Forzar modo HTTP (fetch) en lugar de WebSockets.
// Esto hace que funcione en entornos serverless como Vercel
// sin necesitar el módulo 'ws' de Node.js.
neonConfig.poolQueryViaFetch = true;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      '[Prisma] DATABASE_URL no está definida. Verifica las variables de entorno en Vercel.'
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
