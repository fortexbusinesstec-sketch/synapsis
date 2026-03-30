import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * CONFIGURACIÓN DE TURSO/LIBSQL (Vector Database)
 * Cliente configurado para comunicación de baja latencia con el EDGE.
 */

export const client = createClient({
  url:       process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

export const db = drizzle(client, { schema });
