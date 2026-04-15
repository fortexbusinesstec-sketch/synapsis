/**
 * POST /api/ablation/scenarios/run
 * Ejecuta un escenario multi-turno completo:
 *   1. Crea chat_session y ablation_scenario_run
 *   2. Itera turnos en orden enviando historial acumulado al pipeline
 *   3. Guarda ablation_scenario_turn_results por turno
 *   4. Actualiza ablation_scenario_run con totales
 *
 * Body: { scenarioId, configId, runBatch }
 */
import { NextResponse } from 'next/server';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

export const maxDuration = 300; // escenarios pueden durar 5+ min

/* ── Precios por token ───────────────────────────────────────────────────── */
const MINI_IN  = 0.15  / 1_000_000;
const MINI_OUT = 0.60  / 1_000_000;
const GPT4_IN  = 2.50  / 1_000_000;
const GPT4_OUT = 10.00 / 1_000_000;

function estimateTurnCost(
  flags:      Record<string, unknown>,
  chunks:     number,
  loops:      number,
  turnNumber: number,
): { tokens: number; cost: number } {
  let tokens = 0, cost = 0;

  if (flags.clarifier_enabled) {
    tokens += 640;   cost += 520 * MINI_IN + 120 * MINI_OUT;
  }
  if (flags.planner_enabled) {
    const extra = Math.max(0, loops - 1);
    tokens += (880 + 210) * extra;
    cost   += (880 * MINI_IN + 210 * MINI_OUT) * extra;
  }
  if (flags.selector_enabled) {
    const inp = 1200 + chunks * 155;
    tokens += inp + 75;   cost += inp * MINI_IN + 75 * MINI_OUT;
  }
  if (flags.analista_enabled) {
    const inp = 620 + chunks * 180;
    tokens += (inp + 175) * loops;
    cost   += (inp * MINI_IN + 175 * MINI_OUT) * loops;
  }
  // Ingeniero Jefe (gpt-4o, siempre)
  const ijIn = 1000 + chunks * 200 + Math.max(0, turnNumber - 1) * 360;
  tokens += ijIn + 650;
  cost   += ijIn * GPT4_IN + 650 * GPT4_OUT;

  return { tokens, cost };
}

/* ── Mapeo config → AgentFlags (igual que en ablation/run) ───────────────── */
function configToAgentFlags(row: Record<string, unknown>) {
  const ragOk = row.rag_enabled !== 0;
  return {
    clarifier:     row.clarifier_enabled      !== 0,
    planner:       (row.planner_enabled       ?? 1) !== 0 && ragOk,
    bibliotecario: row.bibliotecario_enabled  !== 0 && ragOk,
    enrichments:   row.enrichments_enabled    !== 0,
    images:        (row.images_enabled        ?? 1) !== 0,
    selector:      (row.selector_enabled      ?? 1) !== 0,
    analista:      row.analista_enabled       !== 0,
    metrifier:     true,
  };
}

/* ── Parser del data stream de Vercel AI ─────────────────────────────────── */
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
  if (buffer.startsWith('0:')) {
    try { text += JSON.parse(buffer.slice(2)) as string; } catch { /* skip */ }
  }
  return text;
}

/* ── Handler ──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const body = await req.json() as {
    scenarioId: string;
    configId:   string;
    runBatch:   string;
  };

  const { scenarioId, configId, runBatch } = body;

  if (!scenarioId || !configId || !runBatch) {
    return NextResponse.json(
      { error: 'scenarioId, configId y runBatch son requeridos' },
      { status: 400 },
    );
  }

  // Evitar duplicados en el mismo batch
  const existingRes = await client.execute({
    sql:  `SELECT id, status FROM ablation_scenario_runs WHERE scenario_id=? AND config_id=? AND run_batch=?`,
    args: [scenarioId, configId, runBatch],
  });
  if (existingRes.rows.length > 0) {
    const ex = existingRes.rows[0] as Record<string, unknown>;
    return NextResponse.json(
      { error: `Ya existe un run ${ex.status} para este escenario en el batch`, existing_id: ex.id },
      { status: 409 },
    );
  }

  // Cargar escenario + turnos + config
  const [scenRes, turnRes, cfgRes] = await Promise.all([
    client.execute({ sql: `SELECT * FROM ablation_scenarios WHERE id = ?`, args: [scenarioId] }),
    client.execute({
      sql:  `SELECT * FROM ablation_scenario_turns WHERE scenario_id = ? ORDER BY turn_number`,
      args: [scenarioId],
    }),
    client.execute({
      sql: `SELECT *, COALESCE(planner_enabled, 1) AS planner_enabled,
                      COALESCE(selector_enabled, 1) AS selector_enabled,
                      COALESCE(images_enabled, 1)   AS images_enabled
            FROM ablation_configurations WHERE id = ?`,
      args: [configId],
    }),
  ]);

  if (!scenRes.rows.length)  return NextResponse.json({ error: 'Escenario no encontrado' }, { status: 404 });
  if (!cfgRes.rows.length)   return NextResponse.json({ error: 'Config no encontrada'   }, { status: 404 });
  if (!turnRes.rows.length)  return NextResponse.json({ error: 'Escenario sin turnos'   }, { status: 404 });

  const scenario = scenRes.rows[0] as Record<string, unknown>;
  const turns    = turnRes.rows    as Record<string, unknown>[];
  const config   = cfgRes.rows[0]  as Record<string, unknown>;

  const agentFlags = configToAgentFlags(config);
  const baseUrl    = new URL(req.url).origin;

  // Crear chat_session
  const sessionId = createId();
  await client.execute({
    sql:  `INSERT INTO chat_sessions (id, mode, equipment_model) VALUES (?, 'record', ?)`,
    args: [sessionId, (scenario.equipment_model as string | null) ?? null],
  });

  // Crear ablation_scenario_run
  const runId = createId();
  await client.execute({
    sql: `INSERT INTO ablation_scenario_runs
            (id, scenario_id, config_id, session_id, run_batch, status, turns_planned)
          VALUES (?, ?, ?, ?, ?, 'running', ?)`,
    args: [runId, scenarioId, configId, sessionId, runBatch, turns.length],
  });

  // Acumuladores de sesión
  let totalLoopsFired    = 0;
  let totalCostUsd       = 0;
  let totalTokens        = 0;
  let totalLatencyMs     = 0;
  let turnsCompleted     = 0;
  let resolutionReached  = 0;
  let turnsToResolution: number | null = null;
  const confidences: number[] = [];

  // Historial de mensajes acumulado para el pipeline de chat
  const messageHistory: Array<{ id: string; role: 'user' | 'assistant'; content: string }> = [];

  try {
    for (const turn of turns) {
      const turnMsg = turn.technician_message as string;
      const userMsgId = createId();

      // Añadir turno del técnico al historial
      messageHistory.push({ id: userMsgId, role: 'user', content: turnMsg });

      const t0 = Date.now();

      const chatRes = await fetch(`${baseUrl}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:       messageHistory,
          equipmentModel: (scenario.equipment_model as string | null) ?? null,
          sessionId,
          sessionMode:    'record',
          agentFlags,
        }),
      });

      if (!chatRes.ok) {
        const errTxt = await chatRes.text().catch(() => `status ${chatRes.status}`);
        throw new Error(`Chat API ${chatRes.status} (turno ${turn.turn_number}): ${errTxt.slice(0, 200)}`);
      }

      // Leer headers ANTES de consumir el body
      const responseMode   = chatRes.headers.get('x-response-mode')    ?? null;
      const detectedIntent = chatRes.headers.get('x-urgency-level')    ?? null;
      const chunksUsed     = parseInt(chatRes.headers.get('x-chunks-retrieved') ?? '0', 10);
      const loopsFired     = parseInt(chatRes.headers.get('x-loops-used')       ?? '0', 10);
      const phase2Tokens   = parseInt(chatRes.headers.get('x-phase2-tokens')    ?? '0', 10);
      const finalConf      = parseFloat(chatRes.headers.get('x-final-confidence') ?? 'NaN');
      const gapType        = chatRes.headers.get('x-gap-types-seen')   ?? null;

      const responseText = await readDataStream(chatRes);
      const latencyMs    = Date.now() - t0;

      // Añadir respuesta del sistema al historial
      messageHistory.push({ id: createId(), role: 'assistant', content: responseText });

      // Acumular métricas
      totalLoopsFired += loopsFired;
      totalLatencyMs  += latencyMs;

      // Estimación de costo por turno basada en el modelo de agentes
      const turnEst = estimateTurnCost(config, chunksUsed, Math.max(1, loopsFired), turnsCompleted + 1);
      totalCostUsd += turnEst.cost;
      totalTokens  += turnEst.tokens;

      turnsCompleted++;
      if (!isNaN(finalConf)) confidences.push(finalConf);

      // Guardar turn result
      await client.execute({
        sql: `INSERT INTO ablation_scenario_turn_results
                (id, scenario_run_id, scenario_turn_id, turn_number,
                 system_response, response_mode, detected_intent,
                 chunks_used, loops_fired, confidence, gap_type, latency_ms, cost_usd)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId(),
          runId,
          turn.id as string,
          turn.turn_number as number,
          responseText,
          responseMode,
          detectedIntent,
          chunksUsed,
          loopsFired,
          isNaN(finalConf) ? null : finalConf,
          gapType,
          latencyMs,
          Number(turnEst.cost.toFixed(6)),
        ],
      });

      // Detectar resolución (si el modo es positivo y confianza alta)
      if (!resolutionReached && !isNaN(finalConf) && finalConf >= 0.8 && responseMode !== 'AMBIGUOUS') {
        resolutionReached = 1;
        turnsToResolution = turnsCompleted;
      }
    }

    const avgConfidence = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : null;

    // Actualizar scenario run como completado
    await client.execute({
      sql: `UPDATE ablation_scenario_runs SET
              status                = 'done',
              turns_completed       = ?,
              resolution_reached    = ?,
              turns_to_resolution   = ?,
              total_loops_fired     = ?,
              avg_confidence_session = ?,
              total_latency_ms      = ?,
              total_cost_usd        = ?,
              total_tokens          = ?
            WHERE id = ?`,
      args: [
        turnsCompleted,
        resolutionReached,
        turnsToResolution,
        totalLoopsFired,
        avgConfidence,
        totalLatencyMs,
        totalCostUsd,
        totalTokens,
        runId,
      ],
    });

    return NextResponse.json({
      runId,
      sessionId,
      turnsCompleted,
      resolutionReached: Boolean(resolutionReached),
      turnsToResolution,
      totalLatencyMs,
      avgConfidence,
    });

  } catch (err) {
    const msg = (err as Error).message;
    await client.execute({
      sql:  `UPDATE ablation_scenario_runs SET status = 'error', error_message = ? WHERE id = ?`,
      args: [msg, runId],
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
