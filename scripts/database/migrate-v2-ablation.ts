/**
 * Migración v2 — Ablación
 *
 * 1. Añade columnas nuevas a ablation_configurations
 * 2. Añade columnas nuevas a ablation_runs
 * 3. Limpia datos del piloto anterior (scores, chunks, runs, summary)
 * 4. Resetea preguntas: desactiva P05/P10, activa el resto
 * 5. Borra todas las configs antiguas e inserta las 8 configs v2 (A–H)
 *
 * Ejecutar: npx tsx scripts/migrate-v2-ablation.ts
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

// Cargar .env manualmente (sin depender de dotenv)
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

async function safeAlter(sql: string) {
  try {
    await client.execute({ sql, args: [] });
    console.log(`✓ ${sql.slice(0, 60)}…`);
  } catch (err: unknown) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log(`⏭ columna ya existe — OK`);
    } else {
      throw err;
    }
  }
}

async function run() {
  console.log('\n=== Migración Synapsis v2 ===\n');

  // ── 1. Añadir columnas a ablation_configurations ───────────────────────
  console.log('── ablation_configurations: nuevas columnas');
  await safeAlter('ALTER TABLE ablation_configurations ADD COLUMN planner_enabled  INTEGER DEFAULT 1');
  await safeAlter('ALTER TABLE ablation_configurations ADD COLUMN selector_enabled INTEGER DEFAULT 1');
  await safeAlter('ALTER TABLE ablation_configurations ADD COLUMN images_enabled   INTEGER DEFAULT 1');

  // ── 2. Añadir columnas a ablation_runs ────────────────────────────────
  console.log('\n── ablation_runs: nuevas columnas');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN loop_count                INTEGER DEFAULT 0');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN planner_queries            TEXT');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN selector_kept              INTEGER');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN final_confidence           REAL');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN redundant_chunks_avoided   INTEGER DEFAULT 0');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN gap_types_seen             TEXT');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN gap_resolved               INTEGER DEFAULT 0');
  await safeAlter('ALTER TABLE ablation_runs ADD COLUMN loop_stopped_reason        TEXT');

  // ── 3. Limpiar datos del piloto anterior ─────────────────────────────
  console.log('\n── Limpiando datos del piloto anterior…');
  await client.execute({ sql: 'DELETE FROM ablation_scores',    args: [] });
  await client.execute({ sql: 'DELETE FROM ablation_run_chunks', args: [] });
  await client.execute({ sql: 'DELETE FROM ablation_runs',       args: [] });
  await client.execute({ sql: 'DELETE FROM ablation_summary',    args: [] });
  console.log('✓ ablation_scores, ablation_run_chunks, ablation_runs, ablation_summary limpiadas');

  // ── 4. Resetear preguntas ─────────────────────────────────────────────
  console.log('\n── Reseteando ablation_questions…');
  await client.execute({
    sql:  `UPDATE ablation_questions SET is_active = 0 WHERE id IN ('P05', 'P10')`,
    args: [],
  });
  await client.execute({
    sql:  `UPDATE ablation_questions SET is_active = 1 WHERE id NOT IN ('P05', 'P10')`,
    args: [],
  });
  console.log('✓ P05 y P10 desactivadas, resto activadas');

  // ── 5. Reemplazar todas las configuraciones ──────────────────────────
  console.log('\n── Actualizando ablation_configurations…');
  await client.execute({ sql: 'DELETE FROM ablation_configurations', args: [] });

  type ConfigRow = [
    string, // id
    string, // name
    string, // description
    number, // clarifier_enabled
    number, // bibliotecario_enabled
    number, // planner_enabled
    number, // selector_enabled
    number, // enrichments_enabled
    number, // analista_enabled
    number, // images_enabled
    number, // is_baseline
    number, // display_order
  ];

  const configs: ConfigRow[] = [
    ['A', 'Sistema completo v2',
     'Todos los agentes v2 activos. Benchmark.',
     1, 1, 1, 1, 1, 1, 1,  1, 1],

    ['B', 'Sin Planificador',
     'Desactiva la re-planificación. Bloquea el Loop 1+ al no permitir búsquedas quirúrgicas de rescate.',
     1, 1, 0, 1, 1, 1, 1,  0, 2],

    ['C', 'Bibliotecario sin enrichments',
     'Solo document_chunks y extracted_images. Sin Q&A experto.',
     1, 1, 1, 1, 0, 1, 1,  0, 3],

    ['D', 'Sin Clarificador',
     'Query cruda al Planificador sin análisis semántico.',
     0, 1, 1, 1, 1, 1, 1,  0, 4],

    ['E', 'Sin Analista',
     'El IJ recibe chunks del Selector sin monólogo interno.',
     1, 1, 1, 1, 1, 0, 1,  0, 5],

    ['F', 'Bibliotecario sin imágenes',
     'Solo document_chunks + enrichments. Sin extracted_images.',
     1, 1, 1, 1, 1, 1, 0,  0, 6],

    ['G', 'Sin Selector de Contexto',
     'Los 10 chunks del Bibliotecario van directos al Analista.',
     1, 1, 1, 0, 1, 1, 1,  0, 7],

    ['H', 'Solo RAG + LLM base',
     'Solo Bibliotecario chunks + Ingeniero Jefe. Sin orquestación.',
     0, 1, 0, 0, 0, 0, 0,  1, 8],
  ];

  for (const [id, name, desc, cl, bi, pl, se, en, an, im, isBase, order] of configs) {
    await client.execute({
      sql: `INSERT INTO ablation_configurations
              (id, name, description,
               clarifier_enabled, bibliotecario_enabled, planner_enabled,
               selector_enabled, enrichments_enabled, analista_enabled,
               images_enabled, is_baseline, display_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [id, name, desc, cl, bi, pl, se, en, an, im, isBase, order],
    });
    console.log(`  ✓ Config ${id}: ${name}`);
  }

  console.log('\n=== Migración completada exitosamente ===\n');
  await client.close();
}

run().catch(err => {
  console.error('ERROR en migración:', err);
  process.exit(1);
});
