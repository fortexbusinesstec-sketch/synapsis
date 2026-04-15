/**
 * Migración para añadir columnas de promedios duales a ablation_summary
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

// Cargar .env manualmente
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines   = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env no encontrado */ }

const client = createClient({
  url:       process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

async function run() {
  console.log('── Modificando tabla ablation_summary (Rubrica Dual)');
  try {
    await client.execute("ALTER TABLE ablation_summary ADD COLUMN avg_score_factual REAL DEFAULT 0");
    await client.execute("ALTER TABLE ablation_summary ADD COLUMN avg_score_diagnostic REAL DEFAULT 0");
    console.log('✓ Columnas avg_score_factual/diagnostic añadidas a summary');
  } catch (err: any) {
    console.log('Fallo o columnas ya existen:', err.message);
  } finally {
    await client.close();
  }
}

run();
