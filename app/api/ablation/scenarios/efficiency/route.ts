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
          config_id,
          AVG(total_latency_ms) as avg_latency,
          AVG(total_loops_fired) as avg_loops
        FROM ablation_scenario_runs
        WHERE run_batch = ?
          AND status = 'done'
        GROUP BY config_id
        ORDER BY config_id ASC
      `,
      args: [batch],
    });

    const rows = result.rows.map(r => ({
      config_id: r.config_id,
      avg_latency: Number(r.avg_latency),
      avg_loops: Number(r.avg_loops)
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[EFFICIENCY API] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
