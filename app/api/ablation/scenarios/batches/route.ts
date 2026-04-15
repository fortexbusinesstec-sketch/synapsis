import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function GET() {
  const result = await client.execute(
    `SELECT run_batch,
            COUNT(*)                                          AS total_runs,
            SUM(CASE WHEN status = 'done'    THEN 1 ELSE 0 END) AS done_runs,
            SUM(CASE WHEN status = 'error'   THEN 1 ELSE 0 END) AS error_runs,
            MIN(created_at) AS started_at
     FROM ablation_scenario_runs
     GROUP BY run_batch
     ORDER BY started_at DESC`,
  );
  return NextResponse.json(result.rows);
}
