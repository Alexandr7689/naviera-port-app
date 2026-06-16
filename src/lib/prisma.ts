import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Configurar el constructor de WebSockets para Node.js (local y Vercel Serverless)
if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  console.log("[DEBUG-PRISMA] DATABASE_URL is:", connectionString ? "defined (length " + connectionString.length + ")" : "undefined");

  if (!connectionString) {
    throw new Error(
      '[Prisma] DATABASE_URL no está definida. Verifica las variables de entorno en Vercel.'
    );
  }

  // Pasar la configuración directamente a PrismaNeon para que cree el pool internamente
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
