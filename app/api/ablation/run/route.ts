/**
 * POST /api/ablation/run
 * Ejecuta un único ablation_run pendiente:
 *   1. Crea una chat_session en modo 'record'
 *   2. Llama a POST /api/chat (consume stream completo → texto final)
 *   3. Actualiza ablation_runs con la respuesta y métricas
 *
 * Body: { runId: string }
 */

import { NextResponse } from 'next/server';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

export const maxDuration = 120; // requiere Vercel Pro; en dev no aplica

/* ── Mapeo config v2 → AgentFlags del pipeline ───────────────────────────── */
function configToAgentFlags(row: Record<string, unknown>) {
  const ragOk = row.rag_enabled !== 0; // legacy — se mantiene para retro-compat
  return {
    clarifier:     row.clarifier_enabled      !== 0,
    planner:       (row.planner_enabled       ?? 1) !== 0 && ragOk,
    bibliotecario: row.bibliotecario_enabled  !== 0 && ragOk,
    enrichments:   row.enrichments_enabled    !== 0,
    images:        (row.images_enabled        ?? 1) !== 0,
    selector:      (row.selector_enabled      ?? 1) !== 0,
    analista:      row.analista_enabled       !== 0,
    metrifier:     true, // siempre activo para persistir la sesión real
  };
}

/* ── Parser del Vercel AI data stream (formato 0:"chunk"\n) ──────────────── */
async function readDataStream(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let text      = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('0:')) {
        try { text += JSON.parse(line.slice(2)) as string; } catch { /* skip */ }
      }
    }
  }
  // Procesar resto del buffer
  if (buffer.startsWith('0:')) {
    try { text += JSON.parse(buffer.slice(2)) as string; } catch { /* skip */ }
  }
  return text;
}

/* ── Handler ──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const { runId } = await req.json() as { runId: string };
  if (!runId) {
    return NextResponse.json({ error: 'runId requerido' }, { status: 400 });
  }

  // Marcar como running
  await client.execute({
    sql:  `UPDATE ablation_runs SET status = 'running' WHERE id = ?`,
    args: [runId],
  });

  try {
    // Obtener run + pregunta + configuración
    const runRes = await client.execute({
      sql: `SELECT r.id, r.question_id, r.config_id, r.run_batch,
                   q.question_text, q.equipment_model,
                   c.clarifier_enabled, c.bibliotecario_enabled, c.analista_enabled,
                   c.enrichments_enabled, c.rag_enabled,
                   COALESCE(c.planner_enabled,   1) AS planner_enabled,
                   COALESCE(c.selector_enabled,  1) AS selector_enabled,
                   COALESCE(c.images_enabled,    1) AS images_enabled
            FROM ablation_runs r
            JOIN ablation_questions      q ON r.question_id = q.id
            JOIN ablation_configurations c ON r.config_id   = c.id
            WHERE r.id = ?`,
      args: [runId],
    });

    if (!runRes.rows.length) {
      throw new Error('Run no encontrado');
    }
    const run = runRes.rows[0] as Record<string, unknown>;

    // Crear chat_session con mode='record'
    const sessionId = createId();
    await client.execute({
      sql:  `INSERT INTO chat_sessions (id, mode, equipment_model) VALUES (?, 'record', ?)`,
      args: [sessionId, (run.equipment_model as string | null) ?? null],
    });

    // Vincular sesión al run
    await client.execute({
      sql:  `UPDATE ablation_runs SET session_id = ? WHERE id = ?`,
      args: [sessionId, runId],
    });

    const agentFlags = configToAgentFlags(run);
    const baseUrl    = new URL(req.url).origin;
    const t0         = Date.now();

    // Llamar al pipeline de chat
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages:       [{ id: createId(), role: 'user', content: run.question_text }],
        equipmentModel: (run.equipment_model as string | null) ?? null,
        sessionId,
        sessionMode:    'record',
        agentFlags,
      }),
    });

    if (!chatRes.ok) {
      const errTxt = await chatRes.text().catch(() => `status ${chatRes.status}`);
      throw new Error(`Chat API ${chatRes.status}: ${errTxt.slice(0, 200)}`);
    }

    // Leer headers de métricas ANTES de consumir el body
    const urgency        = chatRes.headers.get('x-urgency-level')    ?? null;
    const responseMode   = chatRes.headers.get('x-response-mode')    ?? null;
    const phase1Ms       = parseInt(chatRes.headers.get('x-phase1-ms')        ?? '0', 10);
    const phase2Ms       = parseInt(chatRes.headers.get('x-phase2-ms')        ?? '0', 10);
    const chunksRet      = parseInt(chatRes.headers.get('x-chunks-retrieved') ?? '0', 10);
    const imagesRet      = parseInt(chatRes.headers.get('x-images-retrieved') ?? '0', 10);
    const enrichUsed     = parseInt(chatRes.headers.get('x-enrichments-used') ?? '0', 10);
    const phase2Tokens   = parseInt(chatRes.headers.get('x-phase2-tokens')    ?? '0', 10);
    const loopCount            = parseInt(chatRes.headers.get('x-loops-used')            ?? '0', 10);
    const selectorKept         = parseInt(chatRes.headers.get('x-selector-kept')         ?? '0', 10);
    const plannerQueries       = chatRes.headers.get('x-planner-queries')                ?? null;
    const finalConfidence      = parseFloat(chatRes.headers.get('x-final-confidence')    ?? 'NaN');
    const redundantAvoided     = parseInt(chatRes.headers.get('x-redundant-avoided')     ?? '0', 10);
    const gapTypesSeen         = chatRes.headers.get('x-gap-types-seen')                 ?? null;
    const gapResolved          = parseInt(chatRes.headers.get('x-gap-resolved')          ?? '0', 10);
    const loopStoppedReason    = chatRes.headers.get('x-loop-stopped-reason')            ?? null;

    // Consumir el stream → texto completo
    const responseText = await readDataStream(chatRes);
    const totalMs      = Date.now() - t0;

    await client.execute({
      sql: `UPDATE ablation_runs SET
              status                   = 'done',
              response_text            = ?,
              detected_urgency         = ?,
              response_mode            = ?,
              phase1_ms                = ?,
              phase2_ms                = ?,
              total_ms                 = ?,
              phase2_tokens            = ?,
              chunks_retrieved         = ?,
              images_retrieved         = ?,
              enrichments_used         = ?,
              loop_count               = ?,
              planner_queries          = ?,
              selector_kept            = ?,
              final_confidence         = ?,
              redundant_chunks_avoided = ?,
              gap_types_seen           = ?,
              gap_resolved             = ?,
              loop_stopped_reason      = ?
            WHERE id = ?`,
      args: [
        responseText, urgency, responseMode,
        phase1Ms, phase2Ms, totalMs, phase2Tokens,
        chunksRet, imagesRet, enrichUsed,
        loopCount, plannerQueries, selectorKept,
        isNaN(finalConfidence) ? null : finalConfidence,
        redundantAvoided,
        gapTypesSeen,
        gapResolved,
        loopStoppedReason,
        runId,
      ],
    });

    return NextResponse.json({ runId, sessionId, totalMs, responseText: responseText.slice(0, 200) });

  } catch (err) {
    const msg = (err as Error).message;
    await client.execute({
      sql:  `UPDATE ablation_runs SET status = 'error', error_message = ? WHERE id = ?`,
      args: [msg, runId],
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
