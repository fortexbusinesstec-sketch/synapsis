/**
 * Script para limpiar resultados de ablación previos
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
  console.log('── Iniciando limpieza de resultados de ablación…');
  
  try {
    // 1. Borrar scores
    const s = await client.execute("DELETE FROM ablation_scores");
    console.log(`✓ Scores eliminados (${s.rowsAffected})`);

    // 2. Borrar run chunks
    const rc = await client.execute("DELETE FROM ablation_run_chunks");
    console.log(`✓ Chunks de ejecución eliminados (${rc.rowsAffected})`);

    // 3. Borrar runs
    const r = await client.execute("DELETE FROM ablation_runs");
    console.log(`✓ Ejecuciones (runs) eliminadas (${r.rowsAffected})`);

    // 4. Borrar summaries
    const sum = await client.execute("DELETE FROM ablation_summary");
    console.log(`✓ Resúmenes (summaries) eliminados (${sum.rowsAffected})`);

    console.log('\n=== Base de datos de resultados limpia. Listo para el nuevo piloto. ===');

  } catch (err: any) {
    console.error('Error durante la limpieza:', err.message);
  } finally {
    await client.close();
  }
}

run();
