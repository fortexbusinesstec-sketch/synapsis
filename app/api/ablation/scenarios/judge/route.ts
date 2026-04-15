/**
 * POST /api/ablation/scenarios/judge
 * Evalúa una sesión multi-turno completa con GPT-4o como juez.
 * Evalúa 4 dimensiones: progresión diagnóstica, consistencia factual,
 * refinamiento de hipótesis, esfuerzo del técnico (0–2 c/u).
 *
 * Body: { scenarioRunId }
 */
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

export const maxDuration = 120;

/* ── Sistema de puntuación ────────────────────────────────────────────────── */
const JUDGE_SYSTEM_PROMPT =
  'Eres un juez experto en evaluación de sistemas de soporte técnico para ascensores.\n' +
  'Tu tarea es evaluar una sesión de diagnóstico multi-turno entre un técnico y un sistema IA.\n\n' +

  'DIMENSIONES DE EVALUACIÓN (0.0–2.0 cada una):\n\n' +

  '1. score_diagnostic_progression (Progresión Diagnóstica)\n' +
  '   2.0 — El sistema construye coherentemente la hipótesis turno a turno, cada respuesta acota el problema.\n' +
  '   1.5 — Progresión clara pero con 1-2 desviaciones menores.\n' +
  '   1.0 — El sistema responde correctamente por turno pero no acumula contexto entre ellos.\n' +
  '   0.5 — El sistema olvida información de turnos previos o contradice hipótesis anteriores.\n' +
  '   0.0 — Sin progresión diagnóstica; respuestas desconexas o incorrectas.\n\n' +

  '2. score_factual_consistency (Consistencia Factual)\n' +
  '   2.0 — Todos los datos técnicos son correctos y consistentes durante toda la sesión.\n' +
  '   1.5 — 1 error menor que no afecta el diagnóstico principal.\n' +
  '   1.0 — 2-3 imprecisiones menores o 1 error que requiere corrección.\n' +
  '   0.5 — Errores factuales que confunden al técnico.\n' +
  '   0.0 — Errores críticos de seguridad o factualmente incorrectos en puntos clave.\n\n' +

  '3. score_hypothesis_refinement (Refinamiento de Hipótesis)\n' +
  '   2.0 — El sistema actualiza y refina activamente su hipótesis cuando recibe nueva información.\n' +
  '   1.5 — Buen refinamiento con 1-2 oportunidades perdidas de actualizar.\n' +
  '   1.0 — Refinamiento básico pero no proactivo; espera confirmación antes de cambiar hipótesis.\n' +
  '   0.5 — El sistema mantiene la hipótesis inicial aunque los datos la contradigan.\n' +
  '   0.0 — Sin refinamiento; hipótesis fija e incorrecta.\n\n' +

  '4. score_technician_effort (Esfuerzo del Técnico)\n' +
  '   2.0 — Las instrucciones son claras y precisas; el técnico necesita mínimo esfuerzo adicional.\n' +
  '   1.5 — Instrucciones mayormente claras con alguna ambigüedad menor.\n' +
  '   1.0 — El técnico debe inferir pasos o pedir aclaraciones.\n' +
  '   0.5 — Instrucciones vagas o que requieren conocimiento experto para interpretar.\n' +
  '   0.0 — Instrucciones confusas, contradictorias o peligrosas.\n\n' +

  'FLAGS BOOLEANOS:\n' +
  '  resolution_reached:    true si el problema se resolvió o se llegó a un diagnóstico accionable al final.\n' +
  '  critical_error_made:   true si el sistema cometió un error de seguridad o diagnóstico grave.\n' +
  '  contradicted_itself:   true si el sistema contradijo una afirmación propia de turno anterior.\n' +
  '  repeated_question:     true si el sistema pidió la misma información más de una vez.\n\n' +

  'Responde ÚNICAMENTE con este JSON válido:\n' +
  '{\n' +
  '  "score_diagnostic_progression": number,\n' +
  '  "score_factual_consistency": number,\n' +
  '  "score_hypothesis_refinement": number,\n' +
  '  "score_technician_effort": number,\n' +
  '  "resolution_reached": boolean,\n' +
  '  "critical_error_made": boolean,\n' +
  '  "contradicted_itself": boolean,\n' +
  '  "repeated_question": boolean,\n' +
  '  "judge_narrative": "string — párrafo conciso (3-5 oraciones) explicando los puntos fuertes y débiles"\n' +
  '}';

/* ── Handler ──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const { scenarioRunId } = await req.json() as { scenarioRunId: string };

  if (!scenarioRunId) {
    return NextResponse.json({ error: 'scenarioRunId requerido' }, { status: 400 });
  }

  // Verificar que no tenga ya un score
  const existingScore = await client.execute({
    sql:  `SELECT id FROM ablation_scenario_scores WHERE scenario_run_id = ?`,
    args: [scenarioRunId],
  });
  if (existingScore.rows.length > 0) {
    return NextResponse.json({ error: 'Ya evaluado', score_id: existingScore.rows[0] }, { status: 409 });
  }

  // Cargar run + escenario + turnos ejecutados
  const runRes = await client.execute({
    sql: `SELECT sr.*, s.title, s.description, s.resolution_criteria, s.equipment_model,
                 s.category
          FROM ablation_scenario_runs sr
          JOIN ablation_scenarios s ON sr.scenario_id = s.id
          WHERE sr.id = ?`,
    args: [scenarioRunId],
  });

  if (!runRes.rows.length) {
    return NextResponse.json({ error: 'Run no encontrado' }, { status: 404 });
  }

  const run = runRes.rows[0] as Record<string, unknown>;

  if (run.status !== 'done') {
    return NextResponse.json({ error: `Run en estado '${run.status}', debe estar 'done'` }, { status: 400 });
  }

  // Cargar los turnos del escenario (script) y los resultados ejecutados
  const [scriptRes, resultsRes] = await Promise.all([
    client.execute({
      sql:  `SELECT * FROM ablation_scenario_turns WHERE scenario_id = ? ORDER BY turn_number`,
      args: [run.scenario_id as string],
    }),
    client.execute({
      sql:  `SELECT * FROM ablation_scenario_turn_results WHERE scenario_run_id = ? ORDER BY turn_number`,
      args: [scenarioRunId],
    }),
  ]);

  const scriptTurns  = scriptRes.rows  as Record<string, unknown>[];
  const resultTurns  = resultsRes.rows as Record<string, unknown>[];

  // Construir transcripción
  const transcript = scriptTurns.map((t, i) => {
    const result = resultTurns.find((r) => r.turn_number === t.turn_number) ?? resultTurns[i];
    const techMsg = t.technician_message as string;
    const sysResp = result ? (result.system_response as string | null) ?? '(sin respuesta)' : '(no ejecutado)';
    const meta    = result
      ? `[modo: ${result.response_mode ?? 'N/A'} | confianza: ${result.confidence ?? 'N/A'} | loops: ${result.loops_fired ?? 0}]`
      : '';
    return `TURNO ${t.turn_number}:\nTécnico: ${techMsg}\nSistema ${meta}:\n${sysResp}`;
  }).join('\n\n---\n\n');

  const userContent =
    `ESCENARIO: ${run.title as string}\n` +
    `CATEGORÍA: ${run.category as string}\n` +
    `MODELO DE EQUIPO: ${(run.equipment_model as string | null) ?? 'general'}\n` +
    `CRITERIO DE RESOLUCIÓN: ${run.resolution_criteria as string}\n\n` +
    `=== TRANSCRIPCIÓN COMPLETA ===\n\n${transcript}`;

  try {
    const { text, usage } = await generateText({
      model:       openai('gpt-4o'),
      temperature: 0.1,
      maxTokens:   800,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user',   content: userContent         },
      ],
    });

    const inputTok  = usage.promptTokens     ?? (usage as Record<string, number>).inputTokens     ?? 0;
    const outputTok = usage.completionTokens ?? (usage as Record<string, number>).outputTokens ?? 0;
    const judgeTokens = inputTok + outputTok;
    const judgeCost   = inputTok * 2.5e-6 + outputTok * 10e-6; // gpt-4o pricing

    const stripped  = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON en respuesta del juez');

    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const scoreDiag    = typeof raw.score_diagnostic_progression === 'number' ? Math.min(2, Math.max(0, raw.score_diagnostic_progression)) : 1;
    const scoreFactual = typeof raw.score_factual_consistency     === 'number' ? Math.min(2, Math.max(0, raw.score_factual_consistency))     : 1;
    const scoreHypo    = typeof raw.score_hypothesis_refinement   === 'number' ? Math.min(2, Math.max(0, raw.score_hypothesis_refinement))   : 1;
    const scoreTech    = typeof raw.score_technician_effort        === 'number' ? Math.min(2, Math.max(0, raw.score_technician_effort))        : 1;
    const scoreTotal   = (scoreDiag + scoreFactual + scoreHypo + scoreTech) / 4;

    const scoreId = createId();
    await client.execute({
      sql: `INSERT INTO ablation_scenario_scores
              (id, scenario_run_id,
               score_diagnostic_progression, score_factual_consistency,
               score_hypothesis_refinement,  score_technician_effort,
               score_total,
               resolution_reached, critical_error_made, contradicted_itself, repeated_question,
               judge_narrative, judge_model, judge_tokens_used, judge_cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gpt-4o', ?, ?)`,
      args: [
        scoreId, scenarioRunId,
        scoreDiag, scoreFactual, scoreHypo, scoreTech, scoreTotal,
        raw.resolution_reached     ? 1 : 0,
        raw.critical_error_made    ? 1 : 0,
        raw.contradicted_itself    ? 1 : 0,
        raw.repeated_question      ? 1 : 0,
        typeof raw.judge_narrative === 'string' ? raw.judge_narrative : '',
        judgeTokens,
        judgeCost,
      ],
    });

    // Actualizar resolution_reached en el run
    if (raw.resolution_reached) {
      await client.execute({
        sql:  `UPDATE ablation_scenario_runs SET resolution_reached = 1 WHERE id = ?`,
        args: [scenarioRunId],
      });
    }

    return NextResponse.json({
      scoreId,
      scoreTotal,
      scoreDiag,
      scoreFactual,
      scoreHypo,
      scoreTech,
      resolutionReached: Boolean(raw.resolution_reached),
    });

  } catch (err) {
    const msg = (err as Error).message;
    console.error('[scenario-judge]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
