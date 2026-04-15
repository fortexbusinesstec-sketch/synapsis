/**
 * GET /api/ablation/scenarios/runs?batch=X[&configId=Y]
 * Devuelve ablation_scenario_runs con scores y detalle de turnos.
 */
import { NextResponse } from 'next/server';
import { client }       from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batch    = searchParams.get('batch');
  const configId = searchParams.get('configId');

  let sql = `
    SELECT
      sr.id, sr.scenario_id, sr.config_id, sr.session_id, sr.run_batch,
      sr.status, sr.error_message,
      sr.turns_completed, sr.turns_planned,
      sr.resolution_reached, sr.turns_to_resolution,
      sr.total_loops_fired, sr.avg_confidence_session, sr.context_reuse_rate,
      sr.unnecessary_clarifications, sr.total_cost_usd, sr.total_tokens,
      sr.total_latency_ms, sr.created_at,
      s.title        AS scenario_title,
      s.category     AS scenario_category,
      s.difficulty,
      s.equipment_model,
      s.resolution_criteria,
      c.name         AS config_name,
      c.is_baseline,
      c.display_order,
      sc.id                               AS score_id,
      sc.score_diagnostic_progression,
      sc.score_factual_consistency,
      sc.score_hypothesis_refinement,
      sc.score_technician_effort,
      sc.score_total,
      sc.resolution_reached               AS judge_resolution_reached,
      sc.critical_error_made,
      sc.contradicted_itself,
      sc.repeated_question,
      sc.judge_narrative,
      sc.judge_model
    FROM ablation_scenario_runs sr
    JOIN ablation_scenarios        s  ON sr.scenario_id = s.id
    JOIN ablation_configurations   c  ON sr.config_id   = c.id
    LEFT JOIN ablation_scenario_scores sc ON sc.scenario_run_id = sr.id
    WHERE 1=1`;

  const args: string[] = [];
  if (batch)    { sql += ' AND sr.run_batch = ?'; args.push(batch); }
  if (configId) { sql += ' AND sr.config_id = ?'; args.push(configId); }

  sql += ' ORDER BY s.id, c.display_order';

  const result = await client.execute({ sql, args });
  return NextResponse.json(result.rows);
}
