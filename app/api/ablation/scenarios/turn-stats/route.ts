
import { NextResponse } from 'next/server';
import { client }       from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const batch = searchParams.get('batch');

  if (!batch) {
    return NextResponse.json({ error: 'batch requerido' }, { status: 400 });
  }

  try {
    // Obtenemos el promedio de confianza por turno y configuración para un batch
    const res = await client.execute({
      sql: `
        SELECT 
          sr.config_id,
          tr.turn_number,
          AVG(tr.confidence) as avg_confidence
        FROM ablation_scenario_turn_results tr
        JOIN ablation_scenario_runs sr ON tr.scenario_run_id = sr.id
        WHERE sr.run_batch = ? AND tr.confidence IS NOT NULL
        GROUP BY sr.config_id, tr.turn_number
        ORDER BY sr.config_id, tr.turn_number
      `,
      args: [batch],
    });

    // Agrupar por configuración
    const grouped = res.rows.reduce((acc, row: any) => {
      const cid = row.config_id;
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push({
        turn: row.turn_number,
        avgConf: row.avg_confidence
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json(grouped);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
