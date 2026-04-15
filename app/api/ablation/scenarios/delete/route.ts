import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { run_batch } = await req.json();
    if (!run_batch) {
      return NextResponse.json({ error: 'run_batch es requerido' }, { status: 400 });
    }

    // 1. Obtener los IDs de los runs en este batch
    const runsRes = await client.execute({
      sql: 'SELECT id FROM ablation_scenario_runs WHERE run_batch = ?',
      args: [run_batch]
    });
    const runIds = runsRes.rows.map(r => r.id as string);

    if (runIds.length === 0) {
      return NextResponse.json({ message: 'No se encontraron runs para este batch' });
    }

    const placeholders = runIds.map(() => '?').join(',');

    // 2. Borrar scores
    await client.execute({
      sql: `DELETE FROM ablation_scenario_scores WHERE scenario_run_id IN (${placeholders})`,
      args: runIds
    });

    // 3. Borrar turn results
    await client.execute({
      sql: `DELETE FROM ablation_scenario_turn_results WHERE scenario_run_id IN (${placeholders})`,
      args: runIds
    });

    // 4. Borrar el resumen (si existiera una tabla separada, pero se que no la hay aun para escenarios especificos de forma global o si?)
    // Por ahora solo runs.

    // 5. Borrar runs
    const res = await client.execute({
      sql: `DELETE FROM ablation_scenario_runs WHERE run_batch = ?`,
      args: [run_batch]
    });

    return NextResponse.json({ 
      message: `Batch ${run_batch} eliminado`,
      deleted: {
        runs: res.rowsAffected,
        ids: runIds.length
      }
    });

  } catch (err) {
    console.error('[delete-scenario-batch] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
