/**
 * GET /api/ablation/individual/results?batch=X
 *
 * Returns two arrays:
 *  - summary: per-config × per-category AVGs (deduped by latest run per question)
 *  - kpis:    per-config overall AVGs + run count
 *
 * Deduplication strategy: for each (question_id, config_id, run_batch),
 * only the most-recent run (MAX created_at) that has status='done' is used.
 */

import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

const INDIVIDUAL_CONFIGS = ['B', 'D', 'config_bm25_bert', 'config_goms'];

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get('batch');

    if (!batch) {
        return NextResponse.json({ error: 'batch requerido' }, { status: 400 });
    }

    const configPlaceholders = INDIVIDUAL_CONFIGS.map(() => '?').join(',');

    // ── Step 1: Build a deduped CTE — one row per (question, config) ────────────
    //   We pick the latest 'done' run for each question × config combination.
    const dedupCTE = `
    WITH deduped AS (
      SELECT r.id          AS run_id,
             r.question_id,
             r.config_id,
             r.total_ms,
             r.cost_usd,
             r.status,
             q.category,
             ROW_NUMBER() OVER (
               PARTITION BY r.question_id, r.config_id
               ORDER BY     r.created_at DESC
             ) AS rn
      FROM   ablation_runs r
      JOIN   ablation_questions q ON q.id = r.question_id
      WHERE  r.run_batch = ?
        AND  r.config_id IN (${configPlaceholders})
        AND  r.status    = 'done'
    )
  `;
    const baseArgs = [batch, ...INDIVIDUAL_CONFIGS];

    // ── Step 2: KPI summary per config ──────────────────────────────────────────
    const kpiRes = await client.execute({
        sql: `${dedupCTE}
      SELECT
        d.config_id,
        c.name                        AS config_name,
        COUNT(*)                      AS n_runs,
        AVG(s.score_total)            AS avg_score_total,
        AVG(s.score_correctness)      AS avg_score_correctness,
        AVG(s.score_completeness)     AS avg_score_completeness,
        AVG(d.total_ms)               AS avg_total_ms,
        AVG(d.cost_usd)               AS avg_cost_usd
      FROM   deduped d
      JOIN   ablation_configurations c ON c.id = d.config_id
      LEFT JOIN ablation_scores s       ON s.run_id = d.run_id
      WHERE  d.rn = 1
      GROUP BY d.config_id, c.name
      ORDER BY c.display_order`,
        args: baseArgs,
    });

    // ── Step 3: Per-category summary per config ──────────────────────────────────
    const catRes = await client.execute({
        sql: `${dedupCTE}
      SELECT
        d.config_id,
        d.category                    AS question_category,
        COUNT(*)                      AS n_runs,
        AVG(s.score_total)            AS avg_score_total,
        AVG(s.score_correctness)      AS avg_score_correctness,
        AVG(s.score_completeness)     AS avg_score_completeness,
        AVG(d.total_ms)               AS avg_total_ms,
        AVG(d.cost_usd)               AS avg_cost_usd
      FROM   deduped d
      LEFT JOIN ablation_scores s ON s.run_id = d.run_id
      WHERE  d.rn = 1
      GROUP BY d.config_id, d.category
      ORDER BY d.category, d.config_id`,
        args: baseArgs,
    });

    // ── Step 4: Scatter data (one point per run) for Latency vs Quality chart ───
    const scatterRes = await client.execute({
        sql: `${dedupCTE}
      SELECT
        d.config_id,
        d.category,
        d.total_ms,
        d.cost_usd,
        s.score_total
      FROM   deduped d
      LEFT JOIN ablation_scores s ON s.run_id = d.run_id
      WHERE  d.rn = 1
        AND  d.total_ms   IS NOT NULL
        AND  s.score_total IS NOT NULL`,
        args: baseArgs,
    });

    return NextResponse.json({
        kpis: kpiRes.rows,
        summary: catRes.rows,
        scatter: scatterRes.rows,
    });
}
