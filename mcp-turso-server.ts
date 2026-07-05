#!/usr/bin/env node
/**
 * MCP Server — Turso Synapsis Metrics
 *
 * Expone herramientas para consultar las métricas del estudio de ablación
 * de Synapsis MAS directamente desde la base de datos Turso.
 *
 * Uso:
 *   npx tsx mcp-turso-server.ts
 *
 * Luego configurar en opencode.json:
 *   "mcpServers": {
 *     "synapsis-turso": {
 *       "command": "npx",
 *       "args": ["tsx", "mcp-turso-server.ts"]
 *     }
 *   }
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const DB_URL = process.env.TURSO_URL_TESIS || process.env.TURSO_URL || '';
const DB_TOKEN = process.env.TURSO_TOKEN_TESIS || process.env.TURSO_TOKEN || '';

let db: ReturnType<typeof createClient>;
function getDb() {
  if (!db) db = createClient({ url: DB_URL, authToken: DB_TOKEN });
  return db;
}

// ─── Catálogo de métricas ─────────────────────────────────────────────────────
interface MetricDef {
  name: string;
  table: string;
  column: string;
  description: string;
  formula: string;
  range: string;
  comments: string;
}

const METRICS_CATALOG: MetricDef[] = [
  // ── ABLATION_RUNS (Experimento 1 - Single-turn) ─────────────────────────
  { name: 'phase1_ms', table: 'ablation_runs', column: 'phase1_ms', description: 'Latencia total del retrieval (todos los loops combinados)', formula: 'Medición directa en ms desde que se invoca el Bibliotecario hasta que retorna chunks', range: '0–10000 ms', comments: 'Incluye búsqueda vectorial en Turso + parseo de resultados' },
  { name: 'phase2_ms', table: 'ablation_runs', column: 'phase2_ms', description: 'Latencia total del Analista (todos los loops)', formula: 'Medición directa en ms desde que se invoca el Analista hasta que retorna gap/hypothesis', range: '0–15000 ms', comments: 'Incluye llamadas a GPT-4o-mini para análisis de gaps' },
  { name: 'phase3_ms', table: 'ablation_runs', column: 'phase3_ms', description: 'Latencia del stream del Ingeniero Jefe', formula: 'Medición directa en ms del streaming de GPT-4o', range: '0–30000 ms', comments: 'Depende del tamaño de la respuesta generada' },
  { name: 'total_ms', table: 'ablation_runs', column: 'total_ms', description: 'Latencia total de la ejecución', formula: 'phase1_ms + phase2_ms + phase3_ms + overhead de orquestación', range: '0–60000 ms', comments: 'Métrica principal de eficiencia temporal' },
  { name: 'cost_usd', table: 'ablation_runs', column: 'cost_usd', description: 'Costo total del turno en USD', formula: '(input_tokens × input_price + output_tokens × output_price) / 1_000_000, sumado por cada agente usado', range: '0–0.05 USD', comments: 'Usa precios OpenAI (GPT-4o-mini: $0.15/$0.60, GPT-4o: $2.50/$10.00 por M tokens)' },
  { name: 'loop_count', table: 'ablation_runs', column: 'loop_count', description: 'Número de iteraciones del ReAct Loop ejecutadas', formula: 'Contador directo de iteraciones del while(shouldLoop())', range: '1–3', comments: 'Límite superior hardcoded en 3 loops. 1 = sin re-planificación' },
  { name: 'chunks_retrieved', table: 'ablation_runs', column: 'chunks_retrieved', description: 'Número total de chunks recuperados por el Bibliotecario', formula: 'COUNT de chunks devueltos por la consulta vectorial a Turso', range: '0–20', comments: 'Depende del top-k configurado y la claridad de la query' },
  { name: 'images_retrieved', table: 'ablation_runs', column: 'images_retrieved', description: 'Número de imágenes recuperadas por la búsqueda visual', formula: 'COUNT de imágenes devueltas por la Query C anclada', range: '0–10', comments: 'Solo imágenes del mismo documento que los chunks textuales' },
  { name: 'images_shown', table: 'ablation_runs', column: 'images_shown', description: 'Imágenes efectivamente mostradas al Analista', formula: 'images_retrieved filtradas por curador (relevantes + no marcadas como "no útil")', range: '0–10', comments: 'Puede ser menor que images_retrieved si el curador descarta' },
  { name: 'enrichments_used', table: 'ablation_runs', column: 'enrichments_used', description: 'Número de enriquecimientos HITL utilizados en la respuesta', formula: 'COUNT de enrichments que matchearon con la consulta y fueron injectados al contexto', range: '0–5', comments: 'Los enriquecimientos son respuestas de técnicos expertos almacenadas en tabla enrichments' },
  { name: 'final_confidence', table: 'ablation_runs', column: 'final_confidence', description: 'Confianza del Analista al terminar el loop', formula: 'Valor numérico (0.0–1.0) reportado por el Analista en su output', range: '0.0–1.0', comments: '0 = sin confianza, 1 = certeza total' },
  { name: 'gap_resolved', table: 'ablation_runs', column: 'gap_resolved', description: 'Indicador binario: ¿se resolvió el gap de información?', formula: '1 si el Analista reportó needs_more_info=false al final, 0 si no', range: '0/1', comments: 'Solo aplica si loop_count > 1' },
  { name: 'loop_stopped_reason', table: 'ablation_runs', column: 'loop_stopped_reason', description: 'Razón por la que terminó el ReAct Loop', formula: 'Valor categórico: resolved | max_loops | no_confidence_gain | gap_unchanged', range: 'categórico', comments: '"resolved": el Analista dijo tener suficiente info. "max_loops": se llegó a 3 iteraciones. "no_confidence_gain": la confianza no mejoró. "gap_unchanged": mismo gap que iteración anterior.' },
  { name: 'selector_kept', table: 'ablation_runs', column: 'selector_kept', description: 'Chunks seleccionados por el Selector después de filtrar', formula: 'COUNT de chunks que pasaron el filtro del Selector determinístico', range: '3–5', comments: 'El Selector prioriza chunks con gap match sobre los que no' },
  { name: 'redundant_chunks_avoided', table: 'ablation_runs', column: 'redundant_chunks_avoided', description: 'Chunks redundantes descartados por la penalización gap-aware', formula: 'COUNT de chunks duplicados o semánticamente similares que fueron filtrados', range: '0–10', comments: 'Métrica de eficiencia del retrieval: a mayor valor, mejor filtrado' },
  { name: 'detected_intent', table: 'ablation_runs', column: 'detected_intent', description: 'Intención detectada por el Clarificador', formula: 'Valor categórico generado por GPT-4o-mini: education_info | troubleshooting | emergency | ambiguous', range: 'categórico', comments: 'Determina el modo de respuesta del sistema' },
  { name: 'detected_urgency', table: 'ablation_runs', column: 'detected_urgency', description: 'Nivel de urgencia detectado', formula: 'Clasificación por el Analista: baja | media | alta', range: 'baja | media | alta', comments: 'Influye en el tono y la prioridad de la respuesta' },
  { name: 'response_mode', table: 'ablation_runs', column: 'response_mode', description: 'Modo de respuesta del sistema', formula: 'Determinado por detected_intent y detected_urgency: TROUBLESHOOTING | AMBIGUOUS | EMERGENCY | LEARNING | PROCEDURAL | DEEP_ANALYSIS', range: 'categórico', comments: 'Cada modo tiene una plantilla de respuesta diferente en el Ingeniero Jefe' },
  { name: 'planner_queries', table: 'ablation_runs', column: 'planner_queries', description: 'Queries generadas por el Planificador en cada loop', formula: 'JSON array con {text_query, image_query} por cada iteración del loop', range: 'JSON', comments: 'Vacío si loop_count = 1 (no se activó el Planificador)' },
  { name: 'gap_types_seen', table: 'ablation_runs', column: 'gap_types_seen', description: 'Tipos de gap encontrados durante la ejecución', formula: 'JSON array con tipos: component | error_code | measurement | procedure | location', range: 'JSON', comments: 'Acumula todos los tipos de gap detectados en todos los loops' },

  // ── ABLATION_SCORES (Experimento 1 - Judge) ────────────────────────────
  { name: 'score_total', table: 'ablation_scores', column: 'score_total', description: 'Score total ponderado del Juez GPT-4o', formula: '(score_factual × 0.5) + (score_diagnostic × 0.5)', range: '0.0–2.0', comments: 'Métrica principal de calidad. Promedio ponderado de factual y diagnóstico. NO es promedio de los 5 sub-scores.' },
  { name: 'score_correctness', table: 'ablation_scores', column: 'score_correctness', description: 'Corrección técnica de la respuesta', formula: 'Evaluación subjetiva de GPT-4o en escala 0.0–1.0', range: '0.0–1.0', comments: '¿La respuesta es técnicamente correcta?' },
  { name: 'score_completeness', table: 'ablation_scores', column: 'score_completeness', description: 'Completitud de la respuesta', formula: 'Evaluación subjetiva de GPT-4o en escala 0.0–1.0', range: '0.0–1.0', comments: '¿La respuesta cubre todos los aspectos necesarios?' },
  { name: 'score_relevance', table: 'ablation_scores', column: 'score_relevance', description: 'Relevancia técnica de la respuesta', formula: 'Evaluación subjetiva de GPT-4o en escala 0.0–1.0', range: '0.0–1.0', comments: '¿La respuesta resuelve el problema real del técnico?' },
  { name: 'score_clarity', table: 'ablation_scores', column: 'score_clarity', description: 'Claridad y legibilidad de la respuesta', formula: 'Evaluación subjetiva de GPT-4o en escala 0.0–1.0', range: '0.0–1.0', comments: '¿La respuesta es clara y fácil de seguir?' },
  { name: 'score_ablation_impact', table: 'ablation_scores', column: 'score_ablation_impact', description: 'Impacto de la configuración de ablación', formula: 'Evaluación subjetiva de GPT-4o en escala 0.0–1.0', range: '0.0–1.0', comments: '¿La falta de ciertos agentes afectó la calidad de la respuesta?' },
  { name: 'score_factual', table: 'ablation_scores', column: 'score_factual', description: 'Dimensión 1 — Integridad factual', formula: '0.0 = pésimo, 1.0 = aceptable, 2.0 = perfecto (evaluación GPT-4o)', range: '0.0–2.0', comments: 'Dimensión principal. Penalización máxima si hay errores factuales. Voltajes, códigos, pasos y componentes deben coincidir exactamente con el Ground Truth.' },
  { name: 'score_diagnostic', table: 'ablation_scores', column: 'score_diagnostic', description: 'Dimensión 2 — Valor diagnóstico', formula: '0.0 = pésimo, 1.0 = aceptable, 2.0 = perfecto (evaluación GPT-4o)', range: '0.0–2.0', comments: 'Premia: explicar causa raíz, verificaciones ordenadas, advertir consecuencias, dar criterio. Penaliza: repetir el manual, mezclar modelos, pasos sin explicación.' },
  { name: 'safe_decision_rate', table: 'ablation_scores', column: 'safe_decision_rate', description: 'Tasa de decisión segura', formula: '1 si la respuesta es segura o preguntó si no sabía. 0 si alucinó o dio información falsa.', range: '0/1', comments: 'Métrica de seguridad operativa. Binaria por pregunta.' },
  { name: 'factual_errors', table: 'ablation_scores', column: 'factual_errors', description: 'Lista de errores factuales detectados', formula: 'JSON array de strings, cada uno describiendo un error', range: 'JSON', comments: 'Permite auditoría humana de los errores detectados por el juez' },
  { name: 'judge_reasoning', table: 'ablation_scores', column: 'judge_reasoning', description: 'Razonamiento del juez GPT-4o', formula: 'Texto libre, máximo 3 oraciones', range: 'texto', comments: 'Justificación cualitativa del score asignado' },
  { name: 'recall_at_3', table: 'ablation_scores', column: 'recall_at_3', description: 'Recall@3 del retrieval', formula: '1 si el chunk relevante está entre los top 3 recuperados, 0 si no', range: '0/1', comments: 'Métrica de IR. Solo aplica a L0 y L1.' },
  { name: 'mrr', table: 'ablation_scores', column: 'mrr', description: 'Mean Reciprocal Rank', formula: '1/i donde i es la posición (1-indexed) del primer chunk correcto', range: '0.0–1.0', comments: 'Métrica de IR. Penaliza cuando el resultado correcto está en posición baja.' },
  { name: 'judge_tokens_used', table: 'ablation_scores', column: 'judge_tokens_used', description: 'Tokens consumidos por el juez GPT-4o', formula: 'usage.promptTokens + usage.completionTokens', range: '500–3000', comments: 'Costo del judge: input_tok × $2.5 + output_tok × $10 / 1M' },
  { name: 'judge_cost_usd', table: 'ablation_scores', column: 'judge_cost_usd', description: 'Costo del juez GPT-4o en USD', formula: '(judge_tokens_used × precio promedio) / 1_000_000', range: '0.002–0.01 USD', comments: 'El juez usa GPT-4o que es más caro que GPT-4o-mini del pipeline' },

  // ── ABLATION_SCENARIO_RUNS (Experimento 2 - Sesión multi-turno) ────────
  { name: 'turns_completed', table: 'ablation_scenario_runs', column: 'turns_completed', description: 'Turnos completados en la sesión', formula: 'COUNT de turnos ejecutados realmente', range: '0–5', comments: 'Debe coincidir con max_turns del escenario (generalmente 5)' },
  { name: 'turns_planned', table: 'ablation_scenario_runs', column: 'turns_planned', description: 'Turnos planificados para el escenario', formula: 'Valor fijo = max_turns del escenario', range: '5', comments: 'Constante para todos los escenarios del experimento' },
  { name: 'resolution_reached', table: 'ablation_scenario_runs', column: 'resolution_reached', description: '¿Se llegó a resolución al final de la sesión?', formula: '1 si el técnico confirmó resolución en el turno final, 0 si no', range: '0/1', comments: 'Evaluado por el sistema, no por el juez. Diferente del resolution_reached del judge.' },
  { name: 'turns_to_resolution', table: 'ablation_scenario_runs', column: 'turns_to_resolution', description: 'Turnos necesarios para llegar a resolución', formula: 'Número de turno en el que se alcanzó resolución', range: '1–5', comments: 'NULL si no se alcanzó resolución' },
  { name: 'context_reuse_rate', table: 'ablation_scenario_runs', column: 'context_reuse_rate', description: 'Tasa de reutilización de contexto entre turnos', formula: 'Porcentaje de información del turno anterior que fue utilizada en la respuesta actual', range: '0.0–1.0', comments: 'Métrica de memoria conversacional. A mayor valor, mejor uso del historial.' },
  { name: 'unnecessary_clarifications', table: 'ablation_scenario_runs', column: 'unnecessary_clarifications', description: 'Aclaraciones innecesarias solicitadas', formula: 'COUNT de veces que el sistema pidió información ya proporcionada en turnos anteriores', range: '0–5', comments: 'Métrica negativa: mide olvido conversacional' },
  { name: 'total_cost_usd', table: 'ablation_scenario_runs', column: 'total_cost_usd', description: 'Costo total de la sesión completa', formula: 'Suma de cost_usd de todos los turnos de la sesión', range: '0–0.5 USD', comments: 'Acumula 5 turnos × pipeline completo' },
  { name: 'total_tokens', table: 'ablation_scenario_runs', column: 'total_tokens', description: 'Tokens totales consumidos en la sesión', formula: 'Suma de todos los tokens (input + output) de todos los agentes en todos los turnos', range: '10000–100000', comments: 'Incluye clarificador, planificador, analista, ingeniero jefe' },
  { name: 'total_latency_ms', table: 'ablation_scenario_runs', column: 'total_latency_ms', description: 'Latencia total de la sesión completa', formula: 'Suma de total_ms de todos los turnos de la sesión', range: '10000–300000 ms', comments: 'Métrica principal de eficiencia temporal para sesiones multi-turno' },
  { name: 'total_loops_fired', table: 'ablation_scenario_runs', column: 'total_loops_fired', description: 'Total de loops ReAct ejecutados en toda la sesión', formula: 'Suma de loop_count de todos los turnos', range: '5–25', comments: '5 turnos × hasta 3 loops por turno = máximo 15. Valores altos indican ineficiencia.' },
  { name: 'avg_confidence_session', table: 'ablation_scenario_runs', column: 'avg_confidence_session', description: 'Confianza promedio del Analista en toda la sesión', formula: 'AVG(final_confidence) de todos los turnos de la sesión', range: '0.0–1.0', comments: 'Indica qué tan seguro estuvo el sistema durante la conversación' },

  // ── ABLATION_SCENARIO_SCORES (Experimento 2 - Judge multi-turno) ───────
  { name: 'score_diagnostic_progression', table: 'ablation_scenario_scores', column: 'score_diagnostic_progression', description: 'Progresión diagnóstica — ¿construye hipótesis coherente turno a turno?', formula: '0.0–2.0: 0=sin progresión, 1=básica, 2=construcción coherente con acumulación de contexto', range: '0.0–2.0', comments: 'Dimensión 1 del juez multi-turno. Mide si el sistema recuerda y usa información de turnos anteriores.' },
  { name: 'score_factual_consistency', table: 'ablation_scenario_scores', column: 'score_factual_consistency', description: 'Consistencia factual — ¿datos correctos y consistentes en toda la sesión?', formula: '0.0–2.0: 0=errores críticos, 1=2-3 imprecisiones, 2=todos los datos correctos', range: '0.0–2.0', comments: 'Dimensión 2. Un error grave de seguridad = 0 automático.' },
  { name: 'score_hypothesis_refinement', table: 'ablation_scenario_scores', column: 'score_hypothesis_refinement', description: 'Refinamiento de hipótesis — ¿actualiza con nueva información?', formula: '0.0–2.0: 0=hipótesis fija, 1=básico, 2=refinamiento activo y proactivo', range: '0.0–2.0', comments: 'Dimensión 3. Mide capacidad de adaptarse a nuevos datos.' },
  { name: 'score_technician_effort', table: 'ablation_scenario_scores', column: 'score_technician_effort', description: 'Esfuerzo del técnico — ¿instrucciones claras y precisas?', formula: '0.0–2.0: 0=confusas, 1=ambiguas, 2=claras y mínimos pasos adicionales', range: '0.0–2.0', comments: 'Dimensión 4. Premia instrucciones accionables sin requerir expertise adicional.' },
  { name: 'score_total (scenario)', table: 'ablation_scenario_scores', column: 'score_total', description: 'Score total del juez para la sesión multi-turno', formula: '(score_diagnostic_progression + score_factual_consistency + score_hypothesis_refinement + score_technician_effort) / 4', range: '0.0–2.0', comments: 'Promedio simple de las 4 dimensiones. DIFERENTE del score_total de ablation_scores que usa promedio ponderado.' },
  { name: 'resolution_reached (judge)', table: 'ablation_scenario_scores', column: 'resolution_reached', description: '¿El juez considera que se resolvió el problema?', formula: 'Booleano: true si el problema se resolvió o se llegó a diagnóstico accionable', range: 'true|false', comments: 'Evaluado por GPT-4o, no por el sistema. Puede diferir de resolution_reached en scenario_runs.' },
  { name: 'critical_error_made', table: 'ablation_scenario_scores', column: 'critical_error_made', description: '¿El sistema cometió un error crítico de seguridad?', formula: 'Booleano: true si GPT-4o detectó un error de seguridad o diagnóstico grave', range: 'true|false', comments: 'Métrica de seguridad más importante del experimento 2.' },
  { name: 'contradicted_itself', table: 'ablation_scenario_scores', column: 'contradicted_itself', description: '¿El sistema se contradijo entre turnos?', formula: 'Booleano: true si GPT-4o detectó contradicción entre afirmaciones de distintos turnos', range: 'true|false', comments: 'Métrica de coherencia conversacional.' },
  { name: 'repeated_question', table: 'ablation_scenario_scores', column: 'repeated_question', description: '¿El sistema repitió una pregunta ya respondida?', formula: 'Booleano: true si GPT-4o detectó que el sistema pidió información ya proporcionada', range: 'true|false', comments: 'Métrica de memoria conversacional. Relacionado con unnecessary_clarifications.' },
  { name: 'judge_narrative', table: 'ablation_scenario_scores', column: 'judge_narrative', description: 'Narrativa cualitativa del juez', formula: 'Texto libre, 3–5 oraciones evaluando la sesión completa', range: 'texto', comments: 'Proporciona contexto cualitativo para entender los scores numéricos' },

  // ── ABLATION_SCENARIO_TURN_RESULTS (Experimento 2 - Nivel turno) ────────
  { name: 'turn_confidence', table: 'ablation_scenario_turn_results', column: 'confidence', description: 'Confianza del sistema en el turno específico', formula: 'Valor numérico (0.0–1.0) reportado por el Analista para ese turno', range: '0.0–1.0', comments: 'Por turno, no por sesión. Permite ver evolución de confianza dentro del escenario.' },
  { name: 'turn_score', table: 'ablation_scenario_turn_results', column: 'turn_score', description: 'Score del turno individual (no implementado)', formula: 'NULL en datos actuales — campo reservado para evaluación por-turno futura', range: 'N/A', comments: 'Actualmente la evaluación es por sesión completa, no por turno individual.' },
  { name: 'response_mode (turn)', table: 'ablation_scenario_turn_results', column: 'response_mode', description: 'Modo de respuesta del sistema en ese turno', formula: 'TROUBLESHOOTING | AMBIGUOUS | LEARNING | PROCEDURAL | DEEP_ANALYSIS', range: 'categórico', comments: 'Determinado por el Analista según la intención detectada y la urgencia' },
  { name: 'detected_intent (turn)', table: 'ablation_scenario_turn_results', column: 'detected_intent', description: 'Nivel de urgencia detectado por el sistema', formula: 'baja | media | alta — clasificación del Analista', range: 'baja | media | alta', comments: 'baja = consulta educativa, media = troubleshooting, alta = emergencia' },
];

// ─── Herramientas MCP ─────────────────────────────────────────────────────────
const TOOLS = {
  "get_metrics_catalog": {
    name: "get_metrics_catalog",
    description: "Obtiene el catálogo completo de métricas del estudio de ablación con nombre, descripción, fórmula, rango y comentarios",
    inputSchema: {
      type: "object",
      properties: {
        experiment: {
          type: "string",
          enum: ["all", "experimento1", "experimento2"],
          description: "Filtrar por experimento: 1 (single-turn) o 2 (multi-turn scenario)",
        },
        table: {
          type: "string",
          enum: ["all", "ablation_runs", "ablation_scores", "ablation_scenario_runs", "ablation_scenario_scores", "ablation_scenario_turn_results"],
          description: "Filtrar por tabla específica",
        },
      },
    },
  },
  "query_experiment1_scores": {
    name: "query_experiment1_scores",
    description: "Obtiene scores promediados del Experimento 1 (single-turn) agrupados por configuración",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Filtrar por config específica (A, B, C, D, config_goms, config_bm25_bert)",
        },
      },
    },
  },
  "query_experiment1_efficiency": {
    name: "query_experiment1_efficiency",
    description: "Obtiene métricas de eficiencia del Experimento 1 (latencia, costo, loops, tokens) agrupadas por configuración",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Filtrar por config específica",
        },
      },
    },
  },
  "query_experiment2_scores": {
    name: "query_experiment2_scores",
    description: "Obtiene scores promediados del Experimento 2 (multi-turn scenario) agrupados por configuración",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Filtrar por config específica (A, B, C, D)",
        },
      },
    },
  },
  "query_experiment2_efficiency": {
    name: "query_experiment2_efficiency",
    description: "Obtiene métricas de eficiencia del Experimento 2 (latencia, costo, tokens, loops por sesión) agrupadas por configuración",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Filtrar por config específica (A, B, C, D)",
        },
      },
    },
  },
  "query_turn_results": {
    name: "query_turn_results",
    description: "Obtiene métricas a nivel de turno individual del Experimento 2 (confidence, response_mode, detected_intent)",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Filtrar por configuración",
        },
        scenario_id: {
          type: "string",
          description: "Filtrar por escenario (SC01-SC50)",
        },
        limit: {
          type: "number",
          description: "Límite de resultados (default 20)",
        },
      },
    },
  },
  "query_scenario_detail": {
    name: "query_scenario_detail",
    description: "Obtiene el detalle completo de un escenario: definición, turns, run y scores",
    inputSchema: {
      type: "object",
      properties: {
        scenario_id: {
          type: "string",
          description: "ID del escenario (SC01-SC50)",
        },
        config_id: {
          type: "string",
          description: "Configuración (A, B, C, D)",
        },
      },
      required: ["scenario_id", "config_id"],
    },
  },
  "query_aggregated_comparison": {
    name: "query_aggregated_comparison",
    description: "Obtiene comparativa completa entre configuraciones con todas las métricas clave de ambos experimentos",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_metrics_catalog": {
      let filtered = [...METRICS_CATALOG];
      const exp = args.experiment as string;
      const tbl = args.table as string;
      if (exp === "experimento1") {
        filtered = filtered.filter(m => m.table === 'ablation_runs' || m.table === 'ablation_scores');
      } else if (exp === "experimento2") {
        filtered = filtered.filter(m => m.table.startsWith('ablation_scenario'));
      }
      if (tbl && tbl !== "all") {
        filtered = filtered.filter(m => m.table === tbl);
      }
      return {
        content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
      };
    }

    case "query_experiment1_scores": {
      const db = getDb();
      const configFilter = args.config_id ? `AND ar.config_id = '${args.config_id}'` : '';
      const rows = await db.execute(`
        SELECT 
          ar.config_id AS config,
          COUNT(*) AS n_scores,
          ROUND(AVG(s.score_total), 3) AS avg_score_total,
          ROUND(AVG(s.score_correctness), 3) AS avg_correctness,
          ROUND(AVG(s.score_completeness), 3) AS avg_completeness,
          ROUND(AVG(s.score_relevance), 3) AS avg_relevance,
          ROUND(AVG(s.score_clarity), 3) AS avg_clarity,
          ROUND(AVG(s.score_ablation_impact), 3) AS avg_ablation_impact,
          ROUND(AVG(s.score_factual), 3) AS avg_factual,
          ROUND(AVG(s.score_diagnostic), 3) AS avg_diagnostic,
          ROUND(SUM(s.safe_decision_rate) * 100.0 / COUNT(*), 1) AS pct_safe_decision,
          ROUND(AVG(s.recall_at_3), 3) AS avg_recall_at_3,
          ROUND(AVG(s.mrr), 3) AS avg_mrr
        FROM ablation_scores s
        JOIN ablation_runs ar ON s.run_id = ar.id
        WHERE ar.run_batch = 'piloto_01' ${configFilter}
          AND ar.config_id NOT IN ('config_goms', 'config_bm25_bert')
        GROUP BY ar.config_id
        ORDER BY avg_score_total DESC
      `);
      return { content: [{ type: "text", text: JSON.stringify(rows.rows, null, 2) }] };
    }

    case "query_experiment1_efficiency": {
      const db = getDb();
      const configFilter = args.config_id ? `AND ar.config_id = '${args.config_id}'` : '';
      const rows = await db.execute(`
        SELECT 
          ar.config_id AS config,
          COUNT(*) AS n_runs,
          ROUND(AVG(ar.phase1_ms), 0) AS avg_retrieval_ms,
          ROUND(AVG(ar.phase2_ms), 0) AS avg_analyst_ms,
          ROUND(AVG(ar.phase3_ms), 0) AS avg_chief_ms,
          ROUND(AVG(ar.total_ms), 0) AS avg_total_ms,
          ROUND(AVG(ar.cost_usd), 6) AS avg_cost_usd,
          ROUND(AVG(ar.loop_count), 2) AS avg_loops,
          ROUND(AVG(ar.final_confidence), 3) AS avg_confidence,
          ROUND(AVG(ar.chunks_retrieved), 2) AS avg_chunks_retrieved,
          ROUND(AVG(ar.images_retrieved), 2) AS avg_images_retrieved,
          ROUND(AVG(ar.enrichments_used), 2) AS avg_enrichments
        FROM ablation_runs ar
        WHERE ar.status = 'done' AND ar.run_batch = 'piloto_01'
          AND ar.config_id NOT IN ('config_goms', 'config_bm25_bert')
          ${configFilter}
        GROUP BY ar.config_id
        ORDER BY avg_total_ms
      `);
      return { content: [{ type: "text", text: JSON.stringify(rows.rows, null, 2) }] };
    }

    case "query_experiment2_scores": {
      const db = getDb();
      const configFilter = args.config_id ? `AND sr.config_id = '${args.config_id}'` : '';
      const rows = await db.execute(`
        SELECT 
          sr.config_id AS config,
          COUNT(*) AS n_sessions,
          ROUND(AVG(sc.score_diagnostic_progression), 3) AS avg_diag_progression,
          ROUND(AVG(sc.score_factual_consistency), 3) AS avg_factual_consistency,
          ROUND(AVG(sc.score_hypothesis_refinement), 3) AS avg_hypothesis_refinement,
          ROUND(AVG(sc.score_technician_effort), 3) AS avg_technician_effort,
          ROUND(AVG(sc.score_total), 3) AS avg_score_total,
          ROUND(AVG(sc.resolution_reached) * 100.0, 1) AS pct_resolution,
          ROUND(SUM(sc.critical_error_made) * 100.0 / COUNT(*), 1) AS pct_critical_error,
          ROUND(SUM(sc.contradicted_itself) * 100.0 / COUNT(*), 1) AS pct_contradiction,
          ROUND(SUM(sc.repeated_question) * 100.0 / COUNT(*), 1) AS pct_repeated_question,
          ROUND(AVG(sc.judge_tokens_used), 0) AS avg_judge_tokens,
          ROUND(AVG(sc.judge_cost_usd), 6) AS avg_judge_cost
        FROM ablation_scenario_scores sc
        JOIN ablation_scenario_runs sr ON sc.scenario_run_id = sr.id
        ${configFilter ? 'WHERE ' + configFilter.slice(4) : ''}
        GROUP BY sr.config_id
        ORDER BY avg_score_total DESC
      `);
      return { content: [{ type: "text", text: JSON.stringify(rows.rows, null, 2) }] };
    }

    case "query_experiment2_efficiency": {
      const db = getDb();
      const configFilter = args.config_id ? `AND config_id = '${args.config_id}'` : '';
      const rows = await db.execute(`
        SELECT 
          config_id AS config,
          COUNT(*) AS n_sessions,
          ROUND(AVG(turns_completed), 1) AS avg_turns,
          ROUND(AVG(turns_to_resolution), 1) AS avg_turns_to_resolution,
          ROUND(AVG(context_reuse_rate), 3) AS avg_context_reuse,
          ROUND(AVG(unnecessary_clarifications), 2) AS avg_unnecessary_clarifications,
          ROUND(AVG(total_cost_usd), 5) AS avg_cost_usd,
          ROUND(AVG(total_tokens), 0) AS avg_tokens,
          ROUND(AVG(total_latency_ms), 0) AS avg_latency_ms,
          ROUND(AVG(total_loops_fired), 2) AS avg_loops_fired
        FROM ablation_scenario_runs
        WHERE status = 'done' ${configFilter}
        GROUP BY config_id
      `);
      return { content: [{ type: "text", text: JSON.stringify(rows.rows, null, 2) }] };
    }

    case "query_turn_results": {
      const db = getDb();
      const conditions: string[] = [];
      if (args.config_id) conditions.push(`sr.config_id = '${args.config_id}'`);
      if (args.scenario_id) conditions.push(`sr.scenario_id = '${args.scenario_id}'`);
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const limit = (args.limit as number) || 20;
      const rows = await db.execute(`
        SELECT 
          tr.turn_number, tr.response_mode, tr.detected_intent,
          tr.confidence, tr.turn_score,
          sr.config_id, sr.scenario_id
        FROM ablation_scenario_turn_results tr
        JOIN ablation_scenario_runs sr ON tr.scenario_run_id = sr.id
        ${where}
        LIMIT ${limit}
      `);
      return { content: [{ type: "text", text: JSON.stringify(rows.rows, null, 2) }] };
    }

    case "query_scenario_detail": {
      const db = getDb();
      const { scenario_id, config_id } = args as Record<string, string>;
      
      // Escenario definition
      const scen = await db.execute({
        sql: "SELECT * FROM ablation_scenarios WHERE id = ?",
        args: [scenario_id],
      });
      
      // Turn scripts
      const turns = await db.execute({
        sql: "SELECT * FROM ablation_scenario_turns WHERE scenario_id = ? ORDER BY turn_number",
        args: [scenario_id],
      });
      
      // Run data
      const run = await db.execute({
        sql: "SELECT * FROM ablation_scenario_runs WHERE scenario_id = ? AND config_id = ? AND status = 'done' LIMIT 1",
        args: [scenario_id, config_id],
      });
      
      let scores = null;
      if (run.rows.length) {
        const runId = (run.rows[0] as Record<string, unknown>).id;
        scores = await db.execute({
          sql: "SELECT * FROM ablation_scenario_scores WHERE scenario_run_id = ?",
          args: [runId as string],
        });
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            scenario: scen.rows[0],
            turns: turns.rows,
            run: run.rows[0] || null,
            scores: scores?.rows[0] || null,
          }, null, 2),
        }],
      };
    }

    case "query_aggregated_comparison": {
      const db = getDb();
      
      const exp1scores = await db.execute(`
        SELECT 
          ar.config_id AS config,
          ROUND(AVG(s.score_total), 3) AS avg_score_total
        FROM ablation_scores s
        JOIN ablation_runs ar ON s.run_id = ar.id
        WHERE ar.run_batch = 'piloto_01'
          AND ar.config_id NOT IN ('config_goms', 'config_bm25_bert')
        GROUP BY ar.config_id
      `);
      
      const exp2scores = await db.execute(`
        SELECT 
          sr.config_id AS config,
          ROUND(AVG(sc.score_total), 3) AS avg_score_total
        FROM ablation_scenario_scores sc
        JOIN ablation_scenario_runs sr ON sc.scenario_run_id = sr.id
        GROUP BY sr.config_id
      `);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            experimento1_scores: exp1scores.rows,
            experimento2_scores: exp2scores.rows,
          }, null, 2),
        }],
      };
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

// ─── MCP Protocol (JSON-RPC via stdio) ────────────────────────────────────────
process.stdin.setEncoding('utf-8');
let buffer = '';

process.stdin.on('data', async (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);

      if (msg.method === 'initialize') {
        write({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                list: true,
              },
            },
            serverInfo: {
              name: 'synapsis-turso-metrics',
              version: '1.0.0',
            },
          },
        });
      }

      else if (msg.method === 'tools/list') {
        write({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            tools: Object.values(TOOLS),
          },
        });
      }

      else if (msg.method === 'tools/call') {
        const { name, arguments: args } = msg.params;
        try {
          const result = await handleToolCall(name, args || {});
          write({
            jsonrpc: '2.0',
            id: msg.id,
            result,
          });
        } catch (err: unknown) {
          write({
            jsonrpc: '2.0',
            id: msg.id,
            error: {
              code: -32000,
              message: (err as Error).message,
            },
          });
        }
      }

      else if (msg.method === 'notifications/initialized') {
        // No-op
      }

    } catch (err) {
      // Ignore parse errors on partial lines
    }
  }
});

function write(msg: unknown) {
  const str = JSON.stringify(msg);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(str, 'utf-8')}\r\n\r\n${str}`);
}

// Signal ready
write({
  jsonrpc: '2.0',
  method: 'log',
  params: { message: 'Synapsis Turso MCP Server ready. Connect via opencode.json' },
});
