import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * CONFIGURACIÓN DE TURSO/LIBSQL (Vector Database)
 * Cliente configurado para comunicación de baja latencia con el EDGE.
 */

if (!process.env.TURSO_URL_TESIS && !process.env.TURSO_URL) {
  console.warn('⚠️  WARNING: Neither TURSO_URL_TESIS nor TURSO_URL is defined. Database connection will likely fail.');
}

export const client = createClient({
  url: process.env.TURSO_URL_TESIS || process.env.TURSO_URL || 'libsql://dummy-url',
  authToken: process.env.TURSO_TOKEN_TESIS || process.env.TURSO_TOKEN,
});

export const db = drizzle(client, { schema });
