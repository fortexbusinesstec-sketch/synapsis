/**
 * GET /api/ablation/scenarios/runs/[id]
 * Devuelve un scenario_run completo con todos sus turn_results.
 */
import { NextResponse }                   from 'next/server';
import { client }                         from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [runRes, turnsRes, resultsRes] = await Promise.all([
    client.execute({
      sql: `SELECT sr.*, s.title, s.description, s.resolution_criteria, s.category,
                   s.equipment_model, s.difficulty,
                   c.name AS config_name, c.is_baseline,
                   sc.score_total, sc.score_diagnostic_progression,
                   sc.score_factual_consistency, sc.score_hypothesis_refinement,
                   sc.score_technician_effort, sc.resolution_reached AS judge_resolution,
                   sc.critical_error_made, sc.contradicted_itself, sc.repeated_question,
                   sc.judge_narrative
            FROM ablation_scenario_runs sr
            JOIN ablation_scenarios      s  ON sr.scenario_id = s.id
            JOIN ablation_configurations c  ON sr.config_id   = c.id
            LEFT JOIN ablation_scenario_scores sc ON sc.scenario_run_id = sr.id
            WHERE sr.id = ?`,
      args: [id],
    }),
    client.execute({
      sql:  `SELECT * FROM ablation_scenario_turns WHERE scenario_id = (SELECT scenario_id FROM ablation_scenario_runs WHERE id = ?) ORDER BY turn_number`,
      args: [id],
    }),
    client.execute({
      sql:  `SELECT * FROM ablation_scenario_turn_results WHERE scenario_run_id = ? ORDER BY turn_number`,
      args: [id],
    }),
  ]);

  if (!runRes.rows.length) {
    return NextResponse.json({ error: 'Run no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    run:     runRes.rows[0],
    turns:   turnsRes.rows,
    results: resultsRes.rows,
  });
}
