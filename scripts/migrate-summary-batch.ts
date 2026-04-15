/**
 * Script para añadir la columna run_batch a ablation_summary
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
  console.log('── Modificando tabla ablation_summary');
  try {
    await client.execute("ALTER TABLE ablation_summary ADD COLUMN run_batch TEXT DEFAULT 'unknown'");
    console.log('✓ Columna run_batch añadida');
    
    // Intentar crear el índice si no existe
    await client.execute("CREATE INDEX IF NOT EXISTS idx_summary_batch_v2 ON ablation_summary (run_batch, config_id, question_category)");
    console.log('✓ Índice idx_summary_batch_v2 creado');

  } catch (err: any) {
    if (err.message?.includes('duplicate column')) {
      console.log('⏭ Columna ya existe');
    } else {
      console.error('Error:', err);
    }
  } finally {
    await client.close();
  }
}

run();
