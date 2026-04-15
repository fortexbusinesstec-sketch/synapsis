/**
 * POST /api/ablation/reset
 * Elimina registros de ablation_scores, ablation_run_chunks, ablation_runs y ablation_summary.
 *
 * Body:
 *   { scope: 'batch', run_batch: string }  → borra solo ese batch
 *   { scope: 'all' }                       → borra todos los datos de experimento
 *
 * Las preguntas y configuraciones NO se tocan.
 */

import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json() as { scope: 'batch' | 'all'; run_batch?: string };

  if (body.scope === 'batch') {
    if (!body.run_batch?.trim()) {
      return NextResponse.json({ error: 'run_batch requerido para scope=batch' }, { status: 400 });
    }

    const batch = body.run_batch.trim();

    // 1. Obtener IDs de runs del batch para poder borrar scores y chunks (no hay FK cascade)
    const runRows = await client.execute({
      sql:  `SELECT id FROM ablation_runs WHERE run_batch = ?`,
      args: [batch],
    });

    const runIds = runRows.rows.map((r) => r.id as string);

    if (runIds.length === 0) {
      return NextResponse.json({ error: `Batch "${batch}" no encontrado` }, { status: 404 });
    }

    // 2. Borrar en orden de dependencia
    const placeholders = runIds.map(() => '?').join(',');

    const [scoresRes, chunksRes, runsRes, summaryRes] = await Promise.all([
      client.execute({ sql: `DELETE FROM ablation_scores     WHERE run_id IN (${placeholders})`, args: runIds }),
      client.execute({ sql: `DELETE FROM ablation_run_chunks WHERE run_id IN (${placeholders})`, args: runIds }),
      client.execute({ sql: `DELETE FROM ablation_runs       WHERE run_batch = ?`,               args: [batch] }),
      client.execute({ sql: `DELETE FROM ablation_summary    WHERE run_batch = ?`,               args: [batch] }),
    ]);

    return NextResponse.json({
      ok: true,
      batch,
      deleted: {
        scores:    scoresRes.rowsAffected  ?? 0,
        chunks:    chunksRes.rowsAffected  ?? 0,
        runs:      runsRes.rowsAffected    ?? 0,
        summaries: summaryRes.rowsAffected ?? 0,
      },
    });
  }

  if (body.scope === 'all') {
    const [scoresRes, chunksRes, runsRes, summaryRes] = await Promise.all([
      client.execute('DELETE FROM ablation_scores'),
      client.execute('DELETE FROM ablation_run_chunks'),
      client.execute('DELETE FROM ablation_runs'),
      client.execute('DELETE FROM ablation_summary'),
    ]);

    return NextResponse.json({
      ok: true,
      batch: 'ALL',
      deleted: {
        scores:    scoresRes.rowsAffected  ?? 0,
        chunks:    chunksRes.rowsAffected  ?? 0,
        runs:      runsRes.rowsAffected    ?? 0,
        summaries: summaryRes.rowsAffected ?? 0,
      },
    });
  }

  return NextResponse.json({ error: 'scope debe ser "batch" o "all"' }, { status: 400 });
}
