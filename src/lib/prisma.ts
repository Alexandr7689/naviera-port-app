import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

// En Vercel (producción) no hay WebSockets disponibles en serverless.
// Neon soporta conexión HTTP directa sin necesidad de ws.
// Solo usamos ws si estamos en un entorno Node.js local.
if (typeof WebSocket === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
  } catch {
    // En edge runtime no hay ws, Neon usará fetch automáticamente
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel.'
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);
  return new PrismaClient({ adapter } as any);
}

// Reutilizar la instancia en desarrollo para evitar demasiadas conexiones
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
