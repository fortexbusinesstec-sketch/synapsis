/**
 * Migración quirúrgica: añade solo las columnas que faltan en Turso.
 * No toca tablas existentes ni borra datos.
 * Ejecutar: npx tsx scripts/add-missing-columns.ts
 */
import { createClient } from '@libsql/client';

// Use node --env-file=.env or process.env directly


const client = createClient({
  url: process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

const MIGRATIONS = [
  {
    description: 'extracted_images.is_discarded',
    sql: `ALTER TABLE extracted_images ADD COLUMN is_discarded INTEGER DEFAULT 0`,
  },
  {
    description: 'documents.auditor_recommendations',
    sql: `ALTER TABLE documents ADD COLUMN auditor_recommendations TEXT`,
  },
  {
    description: 'ablation_scenario_runs.total_loops_fired',
    sql: `ALTER TABLE ablation_scenario_runs ADD COLUMN total_loops_fired INTEGER DEFAULT 0`,
  },
  {
    description: 'ablation_scenario_runs.avg_confidence_session',
    sql: `ALTER TABLE ablation_scenario_runs ADD COLUMN avg_confidence_session REAL`,
  },
  {
    description: 'ablation_scenario_turn_results.confidence',
    sql: `ALTER TABLE ablation_scenario_turn_results ADD COLUMN confidence REAL`,
  },
  {
    description: 'ablation_runs.gap_resolved',
    sql: `ALTER TABLE ablation_runs ADD COLUMN gap_resolved REAL`,
  },
  {
    description: 'ablation_scores.recall_at_3',
    sql: `ALTER TABLE ablation_scores ADD COLUMN recall_at_3 REAL`,
  },
  {
    description: 'ablation_scores.mrr',
    sql: `ALTER TABLE ablation_scores ADD COLUMN mrr REAL`,
  },
  {
    description: 'ablation_summary.avg_gap_resolved',
    sql: `ALTER TABLE ablation_summary ADD COLUMN avg_gap_resolved REAL`,
  },
  {
    description: 'ablation_summary.avg_recall_at_3',
    sql: `ALTER TABLE ablation_summary ADD COLUMN avg_recall_at_3 REAL`,
  },
  {
    description: 'ablation_summary.avg_mrr',
    sql: `ALTER TABLE ablation_summary ADD COLUMN avg_mrr REAL`,
  },
  {
    description: 'ablation_runs.final_confidence',
    sql: `ALTER TABLE ablation_runs ADD COLUMN final_confidence REAL DEFAULT 0`,
  },
  {
    description: 'ablation_summary.avg_final_confidence',
    sql: `ALTER TABLE ablation_summary ADD COLUMN avg_final_confidence REAL`,
  },
];

async function run() {
  for (const m of MIGRATIONS) {
    try {
      await client.execute(m.sql);
      console.log(`  ✓  ${m.description}`);
    } catch (err: any) {
      if (err?.message?.includes('duplicate column name') || err?.message?.includes('already exists')) {
        console.log(`  –  ${m.description} (ya existe, omitida)`);
      } else {
        console.error(`  ✗  ${m.description}: ${err.message}`);
        process.exit(1);
      }
    }
  }
  console.log('\nMigración completada.');
  process.exit(0);
}

run();
