/**
 * GET /api/ablation/loop-health?batch=<run_batch>
 *
 * Agrega métricas del bucle React y Gap Engine por configuración.
 */
import { NextResponse } from 'next/server';
import { client }       from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batch            = searchParams.get('batch');

  if (!batch) {
    return NextResponse.json({ error: 'batch requerido' }, { status: 400 });
  }

  const result = await client.execute({
    sql: `
      SELECT
        r.config_id,
        c.name                                                          AS config_name,
        c.display_order,
        c.is_baseline,
        COUNT(*)                                                        AS n_runs,

        -- Métricas de loop
        ROUND(AVG(COALESCE(r.loop_count, 0)), 2)                       AS avg_loops,
        ROUND(AVG(r.final_confidence), 3)                              AS avg_confidence,
        ROUND(AVG(COALESCE(r.selector_kept, 0)), 1)                    AS avg_chunks_final,
        ROUND(AVG(COALESCE(r.redundant_chunks_avoided, 0)), 2)         AS avg_redundancy,
        MAX(COALESCE(r.loop_count, 0))                                 AS max_loop_count,
        MIN(r.final_confidence)                                        AS min_confidence,

        -- Métricas de Gap Engine
        ROUND(AVG(COALESCE(r.gap_resolved, 0)) * 100, 1)              AS pct_gap_resolved,
        SUM(CASE WHEN r.loop_stopped_reason = 'resolved'
            THEN 1 ELSE 0 END)                                         AS loops_resolved,
        SUM(CASE WHEN r.loop_stopped_reason = 'gap_unchanged'
            THEN 1 ELSE 0 END)                                         AS loops_stuck,
        SUM(CASE WHEN r.loop_stopped_reason = 'no_confidence_gain'
            THEN 1 ELSE 0 END)                                         AS loops_no_gain,
        SUM(CASE WHEN r.loop_stopped_reason = 'max_loops'
            THEN 1 ELSE 0 END)                                         AS loops_maxed,
        SUM(CASE WHEN COALESCE(r.loop_count, 0) > 1
            THEN 1 ELSE 0 END)                                         AS n_multi_loop,
        SUM(CASE WHEN r.final_confidence < 0.5
            THEN 1 ELSE 0 END)                                         AS n_low_confidence,
        SUM(CASE WHEN r.final_confidence >= 0.7
            THEN 1 ELSE 0 END)                                         AS n_high_confidence
      FROM ablation_runs r
      JOIN ablation_configurations c ON r.config_id = c.id
      WHERE r.run_batch = ?
        AND r.status    = 'done'
      GROUP BY r.config_id
      ORDER BY avg_confidence DESC
    `,
    args: [batch],
  });

  return NextResponse.json(result.rows);
}
