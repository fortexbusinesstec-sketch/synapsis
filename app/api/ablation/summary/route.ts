/**
 * GET  /api/ablation/summary?batch=X — Lee el resumen precalculado
 * POST /api/ablation/summary         — Recalcula y guarda ablation_summary para un batch
 *
 * La tabla summary tiene una fila por (config_id × question_category).
 * La categoría 'all' agrega todas las preguntas del batch.
 */

import { NextResponse } from 'next/server';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

/* ── GET ──────────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batch = searchParams.get('batch');
  if (!batch) {
    return NextResponse.json({ error: 'batch requerido' }, { status: 400 });
  }

  const result = await client.execute({
    sql: `SELECT s.*,
                 c.name AS config_name, c.display_order, c.is_baseline,
                 c.clarifier_enabled, c.bibliotecario_enabled, c.analista_enabled,
                 c.image_validator_enabled, c.rag_enabled
          FROM ablation_summary s
          JOIN ablation_configurations c ON s.config_id = c.id
          WHERE s.run_batch = ?
          ORDER BY s.question_category, c.display_order`,
    args: [batch],
  });
  return NextResponse.json(result.rows);
}

/* ── POST ─────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const { run_batch } = await req.json() as { run_batch: string };
  if (!run_batch) {
    return NextResponse.json({ error: 'run_batch requerido' }, { status: 400 });
  }

  // Categorías presentes en el batch
  const catRes = await client.execute({
    sql:  `SELECT DISTINCT q.category FROM ablation_runs r
           JOIN ablation_questions q ON r.question_id = q.id
           WHERE r.run_batch = ?`,
    args: [run_batch],
  });
  const categories = ['all', ...catRes.rows.map((r) => (r as any).category as string)];

  // Configuraciones presentes en el batch
  const cfgRes = await client.execute({
    sql:  `SELECT DISTINCT config_id FROM ablation_runs WHERE run_batch = ?`,
    args: [run_batch],
  });
  const configIds = cfgRes.rows.map((r) => (r as any).config_id as string);

  // Limpiar resumen previo del mismo batch para evitar duplicados
  await client.execute({
    sql: 'DELETE FROM ablation_summary WHERE run_batch = ?',
    args: [run_batch],
  });

  let computed = 0;

  for (const configId of configIds) {
    for (const cat of categories) {
      const catFilter = cat === 'all' ? '' : 'AND q.category = ?';
      const catArgs   = cat === 'all' ? [] : [cat];

      const agg = await client.execute({
        sql: `SELECT
                AVG(s.score_total)             AS avg_score_total,
                AVG(s.score_correctness)       AS avg_score_correctness,
                AVG(s.score_completeness)      AS avg_score_completeness,
                AVG(s.score_relevance)         AS avg_score_relevance,
                AVG(s.score_clarity)           AS avg_score_clarity,
                AVG(s.score_ablation_impact)   AS avg_score_ablation_impact,
                AVG(s.score_factual)           AS avg_score_factual,
                AVG(s.score_diagnostic)        AS avg_score_diagnostic,
                AVG(r.phase1_ms)               AS avg_phase1_ms,
                AVG(r.total_ms)                AS avg_total_ms,
                AVG(r.cost_usd)                AS avg_cost_usd,
                AVG(r.loop_count)              AS avg_loop_count,
                AVG(r.gap_resolved)            AS avg_gap_resolved,
                AVG(s.recall_at_3)             AS avg_recall_at_3,
                AVG(s.mrr)                     AS avg_mrr,
                AVG(s.safe_decision_rate)      AS avg_sdr,
                COUNT(r.id)                    AS n_runs
              FROM ablation_runs r
              JOIN ablation_scores      s ON s.run_id       = r.id
              JOIN ablation_questions   q ON r.question_id  = q.id
              WHERE r.run_batch = ? AND r.config_id = ? AND r.status = 'done'
              ${catFilter}`,
        args: [run_batch, configId, ...catArgs],
      });

      const row = agg.rows[0] as any;
      if (!row || !row.n_runs) continue;

      await client.execute({
        sql: `INSERT INTO ablation_summary
                (id, run_batch, config_id, question_category,
                 avg_score_total, avg_score_correctness, avg_score_completeness,
                 avg_score_relevance, avg_score_clarity, avg_score_ablation_impact,
                 avg_score_factual, avg_score_diagnostic,
                 avg_phase1_ms, avg_total_ms, avg_cost_usd,
                 avg_loop_count, avg_gap_resolved,
                 avg_recall_at_3, avg_mrr, avg_sdr,
                 n_runs, computed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
        args: [
          createId(), run_batch, configId, cat,
          row.avg_score_total,          row.avg_score_correctness,
          row.avg_score_completeness,   row.avg_score_relevance,
          row.avg_score_clarity,        row.avg_score_ablation_impact,
          row.avg_score_factual,        row.avg_score_diagnostic,
          row.avg_phase1_ms,            row.avg_total_ms,
          row.avg_cost_usd,
          row.avg_loop_count,
          row.avg_gap_resolved,
          row.avg_recall_at_3,
          row.avg_mrr,
          row.avg_sdr,
          row.n_runs,
        ],
      });
      computed++;
    }
  }

  return NextResponse.json({ ok: true, computed });
}
