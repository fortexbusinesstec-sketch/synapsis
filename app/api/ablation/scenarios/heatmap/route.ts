import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batch = searchParams.get('batch');

  if (!batch) {
    return NextResponse.json({ error: 'batch requerido' }, { status: 400 });
  }

  try {
    const result = await client.execute({
      sql: `
        SELECT 
          s.category,
          sr.config_id,
          AVG(sc.score_total) as avg_score
        FROM ablation_scenario_runs sr
        JOIN ablation_scenarios s ON sr.scenario_id = s.id
        JOIN ablation_scenario_scores sc ON sc.scenario_run_id = sr.id
        WHERE sr.run_batch = ?
        GROUP BY s.category, sr.config_id
      `,
      args: [batch],
    });

    const rows = result.rows.map(r => ({
      category: r.category,
      config_id: r.config_id,
      avg_score: Number(r.avg_score)
    }));

    console.log(`[HEATMAP API] Batch: ${batch}, Rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log('[HEATMAP API] Sample payload:', rows[0]);
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[HEATMAP API] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
