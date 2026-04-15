/**
 * Migración para el sistema de rúbrica dual
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
  console.log('── Modificando esquema para Rúbrica Dual');
  
  try {
    // 1. ablation_questions
    console.log('── Modificando ablation_questions…');
    await client.execute("ALTER TABLE ablation_questions ADD COLUMN reasoning_indicators TEXT");
    console.log('  ✓ Columna reasoning_indicators añadida');

    // 2. ablation_scores
    console.log('── Modificando ablation_scores…');
    await client.execute("ALTER TABLE ablation_scores ADD COLUMN score_factual REAL DEFAULT 0");
    await client.execute("ALTER TABLE ablation_scores ADD COLUMN score_diagnostic REAL DEFAULT 0");
    await client.execute("ALTER TABLE ablation_scores ADD COLUMN factual_errors TEXT");
    await client.execute("ALTER TABLE ablation_scores ADD COLUMN diagnostic_value TEXT");
    console.log('  ✓ Columnas de scores duales añadidas');

  } catch (err: any) {
    console.error('Error (posiblemente algunas columnas ya existan):', err.message);
  } finally {
    await client.close();
  }
}

run();
