import { NextResponse } from 'next/server';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

/* ── GET /api/ablation/runs?batch=X[&config=Y][&category=Z] ─────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batch    = searchParams.get('batch');
  const configId = searchParams.get('config');
  const category = searchParams.get('category');

  let sql = `
    SELECT r.id, r.question_id, r.config_id, r.session_id, r.run_batch,
           r.run_index, r.status, r.response_text, r.error_message,
           r.detected_urgency, r.response_mode,
           r.phase1_ms, r.phase2_ms, r.phase3_ms, r.total_ms,
           r.cost_usd, r.chunks_retrieved, r.images_retrieved, r.enrichments_used,
           r.enriched_query, r.created_at,
           q.question_text, q.category, q.category_number, q.difficulty,
           q.equipment_model, q.ground_truth, q.expected_agent_critical,
           c.name  AS config_name,
           c.is_baseline,
           s.score_total, s.score_correctness, s.score_completeness,
           s.score_relevance, s.score_clarity, s.score_ablation_impact,
           s.score_factual, s.score_diagnostic,
           s.factual_errors, s.diagnostic_value,
           s.judge_reasoning, s.judge_model
    FROM ablation_runs r
    JOIN ablation_questions     q ON r.question_id = q.id
    JOIN ablation_configurations c ON r.config_id  = c.id
    LEFT JOIN ablation_scores   s ON s.run_id       = r.id
    WHERE 1=1`;

  const args: string[] = [];
  if (batch)    { sql += ' AND r.run_batch = ?';  args.push(batch); }
  if (configId) { sql += ' AND r.config_id = ?';  args.push(configId); }
  if (category) { sql += ' AND q.category  = ?';  args.push(category); }

  sql += ' ORDER BY q.category_number, r.run_index, c.display_order';

  const result = await client.execute({ sql, args });
  return NextResponse.json(result.rows);
}

/* ── POST /api/ablation/runs — Crear registros pending para un batch ──────── */
export async function POST(req: Request) {
  const body = await req.json() as {
    run_batch:   string;
    config_ids:  string[];
    categories?: string[];
  };

  const { run_batch, config_ids, categories } = body;

  if (!run_batch || !config_ids?.length) {
    return NextResponse.json(
      { error: 'run_batch y config_ids son requeridos' },
      { status: 400 },
    );
  }

  // Preguntas activas que coincidan con las categorías seleccionadas
  let qSql  = 'SELECT id, equipment_model FROM ablation_questions WHERE is_active = 1';
  const qArgs: string[] = [];
  if (categories?.length) {
    qSql += ` AND category IN (${categories.map(() => '?').join(',')})`;
    qArgs.push(...categories);
  }
  const qRes = await client.execute({ sql: qSql, args: qArgs });
  const questions = qRes.rows as unknown as Array<{ id: string; equipment_model: string | null }>;

  if (!questions.length) {
    return NextResponse.json(
      { error: 'No hay preguntas activas para las categorías seleccionadas' },
      { status: 400 },
    );
  }

  const created: string[] = [];
  let runIndex = 0;

  for (const q of questions) {
    for (const configId of config_ids) {
      // Evitar duplicados en el mismo batch
      const existing = await client.execute({
        sql:  'SELECT id FROM ablation_runs WHERE question_id=? AND config_id=? AND run_batch=?',
        args: [q.id, configId, run_batch],
      });
      if (existing.rows.length > 0) {
        created.push((existing.rows[0] as any).id as string);
        runIndex++;
        continue;
      }

      const id = createId();
      await client.execute({
        sql:  `INSERT INTO ablation_runs
                 (id, question_id, config_id, run_batch, run_index, status)
               VALUES (?, ?, ?, ?, ?, 'pending')`,
        args: [id, q.id, configId, run_batch, runIndex],
      });
      created.push(id);
      runIndex++;
    }
  }

  return NextResponse.json({ total: created.length, run_ids: created });
}
