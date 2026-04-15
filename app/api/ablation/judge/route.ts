/**
 * POST /api/ablation/judge
 * Evalúa una ejecución completada usando GPT-4o como juez (temperature=0).
 * Guarda el resultado en ablation_scores.
 *
 * Body: { runId: string }
 */

import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

export const maxDuration = 60;

const JUDGE_SYSTEM = `Eres evaluador de un asistente técnico para técnicos de ascensores Schindler.
Evalúa la respuesta generada comparándola con el Ground Truth (Factual Core + Indicadores de Razonamiento).

Debes devolver ÚNICAMENTE un JSON con este formato exacto:
{
  "score_correctness": <0.0-1.0>,
  "score_completeness": <0.0-1.0>,
  "score_relevance": <0.0-1.0>,
  "score_clarity": <0.0-1.0>,
  "score_ablation_impact": <0.0-1.0>,
  "score_factual": <0.0-2.0>,
  "score_diagnostic": <0.0-2.0>,
  "factual_errors": ["error 1", "error 2"],
  "diagnostic_value_explanation": "explicación breve de puntos de valor añadidos considerando los indicadores",
  "safe_decision_rate": <1 si es seguro o preguntó si no sabía, 0 si alucinó o dio info falsa>,
  "judge_reasoning": "<máximo 3 oraciones>"
}

Rúbrica Dual:

DIMENSIÓN 1 — Integridad factual (no negociable):
Compara los datos técnicos de la respuesta contra el FACUAL CORE del Ground Truth.
Voltajes, códigos, pasos, componentes: deben coincidir exactamente.
Un error factual aquí es penalización máxima sin importar el resto.
Score: 0.0 – 2.0 (0.0=pésimo, 1.0=aceptable, 2.0=perfecto)

DIMENSIÓN 2 — Valor diagnóstico (Racional):
Evalúa si la respuesta ayuda al técnico a ENTENDER y RESOLVER, usando los Indicadores de Razonamiento como guía.
Premia si:
- Explica la causa raíz detrás del síntoma (+)
- Propone verificaciones ordenadas por probabilidad (+)
- Advierte sobre consecuencias si no se actúa (+)
- Da al técnico criterio para decidir, no solo datos (+)

Penaliza si:
- Repite el manual sin añadir razonamiento (-)
- Mezcla información de modelos distintos (-)
- Da pasos sin explicar por qué en ese orden (-)
Score: 0.0 – 2.0

El score_total será calculado externamente como (0.5 × factual) + (0.5 × diagnóstico).`;

export async function POST(req: Request) {
  const { runId } = await req.json() as { runId: string };
  if (!runId) {
    return NextResponse.json({ error: 'runId requerido' }, { status: 400 });
  }

  // Obtener datos del run
  const runRes = await client.execute({
    sql: `SELECT r.response_text, r.loop_count, r.gap_resolved, r.loop_stopped_reason,
                 q.question_text, q.ground_truth, q.reasoning_indicators,
                 c.name AS config_name,
                 c.clarifier_enabled, c.bibliotecario_enabled, c.analista_enabled,
                 c.planner_enabled, c.selector_enabled,
                 c.enrichments_enabled, c.images_enabled, c.rag_enabled
          FROM ablation_runs r
          JOIN ablation_questions      q ON r.question_id = q.id
          JOIN ablation_configurations c ON r.config_id   = c.id
          WHERE r.id = ? AND r.status = 'done'`,
    args: [runId],
  });

  if (!runRes.rows.length) {
    return NextResponse.json(
      { error: 'Run no encontrado o no completado' },
      { status: 404 },
    );
  }

  const run = runRes.rows[0] as unknown as {
    response_text: string | null;
    loop_count: number | null;
    gap_resolved: number | null;
    loop_stopped_reason: string | null;
    question_text: string;
    ground_truth: string;
    reasoning_indicators: string | null;
    config_name: string;
    clarifier_enabled: number;
    bibliotecario_enabled: number;
    analista_enabled: number;
    planner_enabled: number;
    selector_enabled: number;
    images_enabled: number;
    enrichments_enabled: number;
    rag_enabled: number;
  };

  // Identificar agentes deshabilitados para el contexto del juez
  const disabled: string[] = [];
  if (!run.rag_enabled)              disabled.push('RAG completo (sin recuperación vectorial)');
  else {
    if (!run.clarifier_enabled)      disabled.push('Clarificador (Nodo 0)');
    if (!run.bibliotecario_enabled)  disabled.push('Bibliotecario (Nodo 2)');
    if (!run.analista_enabled)       disabled.push('Analista (Nodo 4 - Control de Bucle)');
    if (!run.planner_enabled)        disabled.push('Planificador (Nodo 1 - Rescate Quirúrgico de Gaps)');
    if (!run.selector_enabled)       disabled.push('Selector (Nodo 3)');
    if (!run.images_enabled)         disabled.push('Búsqueda visual (Imágenes/Esquemas)');
  }

  const loopInfo = `Ejecución finalizada en ${run.loop_count ?? 1} loop(s). ` +
                   (run.gap_resolved === 1 ? 'El Gap Engine logró resolver la laguna de información.' :
                    (run.loop_count ?? 0) > 1 ? 'Se intentó resolver un Gap pero no se obtuvo ganancia de confianza.' :
                    'Búsqueda directa sin necesidad de re-planificación.');

  const userPrompt = [
    `PREGUNTA DEL TÉCNICO:\n${run.question_text}`,
    `\nGROUND TRUTH (FACUAL CORE):\n${run.ground_truth}`,
    `\nINDICADORES DE RAZONAMIENTO ESPERADOS:\n${run.reasoning_indicators || '[]'}`,
    `\nRESPUESTA GENERADA — Configuración "${run.config_name}":\n${(run.response_text as string | null) ?? '(sin respuesta)'}`,
    `\nCONTEXTO DE EJECUCIÓN: ${loopInfo}`,
    `\nAGENTES DESHABILITADOS: ${disabled.length ? disabled.join(', ') : 'Ninguno — configuración completa (A)'}`,
  ].join('');

  try {
    const t0 = Date.now();
    const { text, usage } = await generateText({
      model:       openai('gpt-4o'),
      temperature: 0,
      maxTokens:   600,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM },
        { role: 'user',   content: userPrompt },
      ],
    });

    // Parsear JSON del juez — extraer primer objeto JSON balanceado
    const jsonMatch = text.match(/\{[\s\S]*?\}(?=\s*$|\s*```)/m) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`El juez no devolvió JSON válido. Respuesta: ${text.slice(0, 200)}`);

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(`JSON malformado del juez: ${jsonMatch[0].slice(0, 200)}`);
    }

    // Extraer con fallbacks — Turso no acepta undefined
    const scoreCorrectness = typeof raw.score_correctness === 'number' ? raw.score_correctness : 0;
    const scoreCompleteness = typeof raw.score_completeness === 'number' ? raw.score_completeness : 0;
    const scoreRelevance = typeof raw.score_relevance === 'number' ? raw.score_relevance : 0;
    const scoreClarity = typeof raw.score_clarity === 'number' ? raw.score_clarity : 0;
    const scoreAblationImpact = typeof raw.score_ablation_impact === 'number' ? raw.score_ablation_impact : 0;

    const scoreFactual    = typeof raw.score_factual    === 'number' ? raw.score_factual    : 0;
    const scoreDiagnostic = typeof raw.score_diagnostic === 'number' ? raw.score_diagnostic : 0;
    const factualErrors   = Array.isArray(raw.factual_errors) ? raw.factual_errors : [];
    const diagnosticValue = typeof raw.diagnostic_value_explanation === 'string'
      ? raw.diagnostic_value_explanation
      : (typeof raw.diagnostic_value === 'string' ? raw.diagnostic_value : '');
    const safeDecisionRate = typeof raw.safe_decision_rate === 'number' ? raw.safe_decision_rate : 0;
    const judgeReasoning  = typeof raw.judge_reasoning === 'string' ? raw.judge_reasoning : '';

    // score_total = (0.5 × integridad_factual) + (0.5 × valor_diagnostico)
    const scoreTotal = (scoreFactual * 0.5) + (scoreDiagnostic * 0.5);

    // Costo estimado GPT-4o (input $2.5 / output $10 por M tokens)
    const inputTok  = usage.promptTokens ?? 0;
    const outputTok = usage.completionTokens ?? 0;
    const judgeCostUsd = (inputTok * 2.5 + outputTok * 10) / 1_000_000;

    await client.execute({
      sql: `INSERT OR REPLACE INTO ablation_scores
              (id, run_id,
               score_correctness, score_completeness, score_relevance,
               score_clarity, score_ablation_impact,
               score_factual, score_diagnostic, factual_errors, diagnostic_value,
               score_total,
               recall_at_3, mrr, safe_decision_rate,
               judge_reasoning, judge_model, judge_tokens_used, judge_cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        createId(), runId,
        scoreCorrectness, scoreCompleteness, scoreRelevance,
        scoreClarity, scoreAblationImpact,
        scoreFactual, scoreDiagnostic,
        JSON.stringify(factualErrors),
        diagnosticValue,
        scoreTotal,
        0, 0.0, safeDecisionRate,              // recall_at_3, mrr, safe_decision_rate
        judgeReasoning,
        'gpt-4o',
        inputTok + outputTok,
        judgeCostUsd,
      ],
    });

    return NextResponse.json({
      runId,
      scoreTotal:  Math.round(scoreTotal * 100) / 100,
      evalMs:      Date.now() - t0,
      score_factual:    scoreFactual,
      score_diagnostic: scoreDiagnostic,
      factual_errors:   factualErrors,
      diagnostic_value_explanation: diagnosticValue,
      judge_reasoning:  judgeReasoning,
    });

  } catch (err) {
    console.error('[judge] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
