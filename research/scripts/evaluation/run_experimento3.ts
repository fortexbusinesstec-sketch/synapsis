/**
 * run_experimento3.ts
 *
 * Ejecuta 18 preguntas (de 20 seleccionadas) × 3 configuraciones (B5, E, D) contra el pipeline
 * Synapse, capturando por-agente: latencia ms, tokens (input/output), coste USD,
 * scores del juez GPT-4o, y metadatos de debugging.
 *
 * Salida: JSON + CSV en research/scripts/evaluation/
 *
 * Uso: npx tsx research/scripts/evaluation/run_experimento3.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

/* ── Cargar .env ANTES de cualquier import dinámico que necesite DB ─────── */
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}

const RUN_BATCH = `experimento3_${Date.now()}`;
const OUTPUT_DIR = resolve(process.cwd(), 'research/scripts/evaluation');

/* ── Precios OpenAI (USD / 1M tokens) ───────────────────────────────────── */
const PRICING = {
  'gpt-4o-mini':      { input: 0.15, output: 0.60 },
  'gpt-4o':           { input: 2.50, output: 10.00 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
} as const;

/* ── Tipos ──────────────────────────────────────────────────────────────── */
interface Question {
  id: string; category: string; category_number: number;
  question_text: string; difficulty: string;
  ground_truth: string; reasoning_indicators: string | null;
  requires_visual: number; requires_enrichment: number;
  requires_ordering: number; is_ambiguous: number;
  equipment_model: string; is_active: number; created_at: number;
}

interface Config {
  id: string; name: string; description: string | null;
  clarifier_enabled: number; bibliotecario_enabled: number;
  analista_enabled: number; planner_enabled: number;
  selector_enabled: number; images_enabled: number;
  enrichments_enabled: number; rag_enabled: number;
}

interface AgentTiming {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface ExperimentRow {
  index: number;
  question_id: string;
  question_category: string;
  question_text: string;
  difficulty: string;
  equipment_model: string | null;
  ground_truth: string;
  config_id: string;
  config_name: string;
  response: string;
  timestamp: string;

  clarifier_ms: number;
  semantic_router_ms: number;
  buscador_documental_ms: number;
  buscador_visual_ms: number;
  curador_ms: number;
  analista_ms: number;
  planner_loops_ms: number[];
  verifier_ms: number;
  chief_engineer_ms: number;
  total_pipeline_ms: number;

  clarifier_input_tokens: number;
  clarifier_output_tokens: number;
  semantic_router_input_tokens: number;
  semantic_router_output_tokens: number;
  buscador_documental_embed_tokens: number;
  buscador_visual_embed_tokens: number;
  analista_input_tokens: number;
  analista_output_tokens: number;
  planner_input_tokens: number;
  planner_output_tokens: number;
  verifier_input_tokens: number;
  verifier_output_tokens: number;
  chief_engineer_input_tokens: number;
  chief_engineer_output_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;

  cost_clarifier_usd: number;
  cost_semantic_router_usd: number;
  cost_buscadores_embed_usd: number;
  cost_analista_usd: number;
  cost_planner_usd: number;
  cost_verifier_usd: number;
  cost_chief_engineer_usd: number;
  cost_total_usd: number;

  loop_count: number;
  gap_resolved: boolean;
  final_confidence: number;
  loop_stopped_reason: string;

  chunks_retrieved: number;
  images_retrieved: number;
  images_shown: number;

  score_correctness: number;
  score_completeness: number;
  score_relevance: number;
  score_clarity: number;
  score_ablation_impact: number;
  score_factual: number;
  score_diagnostic: number;
  score_total: number;
  factual_errors: string[];
  diagnostic_value: string;
  safe_decision_rate: number;
  judge_reasoning: string;
  judge_input_tokens: number;
  judge_output_tokens: number;
  judge_cost_usd: number;
  judge_ms: number;

  best_distance: number;
  component_mismatch: number;
  rescue_used: number;
  doc_titulos: string[];
  verifier_valid: boolean | null;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function estTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function costTokens(model: keyof typeof PRICING, input: number, output: number): number {
  return (input * PRICING[model].input + output * PRICING[model].output) / 1_000_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/* ── Cargar datos desde DB ─────────────────────────────────────────────── */
async function loadQuestions(client: ReturnType<typeof createClient>): Promise<Question[]> {
  const res = await client.execute(
    'SELECT * FROM ablation_questions WHERE is_active = 1 ORDER BY id ASC'
  );
  return res.rows as unknown as Question[];
}

async function loadConfig(client: ReturnType<typeof createClient>, id: string): Promise<Config | null> {
  const res = await client.execute({
    sql: 'SELECT * FROM ablation_configurations WHERE id = ?',
    args: [id],
  });
  return (res.rows[0] as unknown as Config) ?? null;
}

/* ── Main ──────────────────────────────────────────────────────────────── */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXPERIMENTO 3 — ${RUN_BATCH}`);
  console.log(`${'='.repeat(60)}\n`);

  const dbClient = createClient({
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS,
  });

  /* ── Las 20 preguntas seleccionadas del markdown (18 existen en DB, SC01/SC03 no) ── */
  const SELECTED_QS = new Set([
    'Q001','Q002','Q003','Q010','Q015',    // P01,P02,P03,P14,P04
    'Q021','Q024','Q022','Q023','Q062',    // P05,P06,P07,P08,P13
    'Q082','Q042','Q041','Q048','Q057',    // P18,P09,P11,P12,P10
    'Q064','Q081','Q085',                  // P16,P17,P19
  ]);

  /* ── Cargar preguntas y configuraciones ────────────────────────────────── */
  const allQuestions = await loadQuestions(dbClient);
  const questions = allQuestions.filter(q => SELECTED_QS.has(q.id));
  console.log(`Preguntas activas: ${allQuestions.length}`);
  console.log(`Usando ${questions.length}/${SELECTED_QS.size} preguntas del markdown (SC01/SC03 no existen en DB)`);

  const configIds = ['B5', 'E', 'D'];
  const configs: Config[] = [];
  for (const cid of configIds) {
    const c = await loadConfig(dbClient, cid);
    if (!c) { console.error(`Config "${cid}" no encontrada en DB. Abortando.`); process.exit(1); }
    configs.push(c);
    console.log(`  Config "${c.id}": ${c.name}`);
  }
  dbClient.close();

  /* ── Dynamic imports (after env is loaded) ─────────────────────────────── */
  const [
    { runClarifier },
    { runSemanticRouter },
    { runBuscadorDocumental },
    { runBuscadorVisual },
    { runCurador },
    { runAnalista, shouldLoop, ANALISTA_FAILSAFE },
    { runPlanner },
    { runVerifier },
    { generateText },
    { openai },
    { PROMPT_DIAGNOSTICO, PROMPT_MENTOR_V2 },
  ] = await Promise.all([
    import('@/lib/agents/clarifier') as any,
    import('@/lib/agents/semantic_router') as any,
    import('@/lib/agents/sub-buscador-documental') as any,
    import('@/lib/agents/sub-buscador-visual') as any,
    import('@/lib/agents/sub-curador') as any,
    import('@/lib/agents/analista') as any,
    import('@/lib/agents/planner') as any,
    import('@/lib/agents/verifier') as any,
    import('ai') as any,
    import('@ai-sdk/openai') as any,
    import('@/lib/agents/prompts') as any,
  ]);

  /* ── Flags extra que no están en DB (solo existen en código) ──────────── */
  const EXTRA_FLAGS: Record<string, { semantic_router: boolean; verifier: boolean; react_loop: boolean }> = {
    'B5': { semantic_router: true,  verifier: true,  react_loop: true },
    'E':  { semantic_router: false, verifier: false, react_loop: true },
    'D':  { semantic_router: false, verifier: false, react_loop: false },
  };

  const TOTAL_RUNS = questions.length * configs.length;
  const results: ExperimentRow[] = [];
  let idx = 0;

  /* ── Iterar sobre cada (pregunta × config) ─────────────────────────────── */
  for (const q of questions) {
    for (const cfg of configs) {
      idx++;
      const qId = q.id;
      const cfgId = cfg.id;
      const model = q.equipment_model || '3300';
      const modo: 'diagnostico' = 'diagnostico';
      const timestamp = new Date().toISOString();

      const flags = EXTRA_FLAGS[cfgId] ?? { semantic_router: false, verifier: false, react_loop: false };
      console.log(`\n[${idx}/${TOTAL_RUNS}] ${qId} × ${cfgId} — "${q.question_text.slice(0, 60)}..."`);

      const startTotal = performance.now();

      /* ── Timings ───────────────────────────────────────────────────────── */
      const timings: Record<string, AgentTiming> = {};
      let analistaOutput = ANALISTA_FAILSAFE;
      let groundTruth = '';
      let validatedImages: any[] = [];
      let chunksRetrieved = 0;
      let imagesRetrievedCount = 0;
      let bestDistance = 1.0;
      let componentMismatch = false;
      let rescueUsed = false;
      let hasEnrichments = false;
      let docsConsultados: any = { docBaseUsed: false, titulos: [] };
      let queryIntent = 'troubleshooting';
      let enrichedQuery = q.question_text;
      let entitiesForSearch: string[] = [];
      let verifierValid: boolean | null = null;
      let totalLoopsUsed = 0;
      let plannerTimings: AgentTiming[] = [];
      let loopHistory: any[] = [];

      /* ── FASE 0 — CLARIFICADOR ─────────────────────────────────────────── */
      if (cfg.clarifier_enabled) {
        try {
          const t0 = performance.now();
          const out = await runClarifier({
            userQuery: q.question_text,
            equipmentModel: model,
            historyContext: '',
            modo,
          });
          const t1 = performance.now();
          queryIntent = out.intent;
          const usage = (out as any)._usage;
          timings['clarifier'] = {
            latencyMs: t1 - t0,
            inputTokens: usage?.promptTokens ?? 0,
            outputTokens: usage?.completionTokens ?? 0,
            costUsd: costTokens('gpt-4o-mini', usage?.promptTokens ?? 0, usage?.completionTokens ?? 0),
          };
        } catch (e) {
          console.error(`    [WARN] Clarifier falló:`, (e as Error).message);
        }
      }

      /* ── FASE 0.5 — ENRUTADOR SEMÁNTICO ────────────────────────────────── */
      if (flags.semantic_router) {
        try {
          const t0 = performance.now();
          const result = await runSemanticRouter(enrichedQuery);
          const t1 = performance.now();
          entitiesForSearch = result.data?.entidades_criticas ?? [];
          timings['semantic_router'] = {
            latencyMs: t1 - t0,
            inputTokens: result.usage?.promptTokens ?? 0,
            outputTokens: result.usage?.completionTokens ?? 0,
            costUsd: costTokens('gpt-4o-mini', result.usage?.promptTokens ?? 0, result.usage?.completionTokens ?? 0),
          };
        } catch (e) {
          console.error(`    [WARN] Semantic Router falló:`, (e as Error).message);
        }
      }

      /* ── FASE 1 — BUSCADORES + CURADOR ─────────────────────────────────── */
      try {
        const t0 = performance.now();
        const docResult = await runBuscadorDocumental(
          enrichedQuery, model, queryIntent as any, entitiesForSearch
        );
        const t1 = performance.now();
        timings['buscador_documental'] = {
          latencyMs: t1 - t0,
          inputTokens: estTokens(enrichedQuery + entitiesForSearch.join(' ')),
          outputTokens: 0,
          costUsd: costTokens('text-embedding-3-small', estTokens(enrichedQuery), 0),
        };

        const docIds = [...new Set(docResult.chunks.map((c: any) => c.document_id))];
        const t2 = performance.now();
        const imgResult = await runBuscadorVisual(enrichedQuery, docIds, model);
        const t3 = performance.now();
        imagesRetrievedCount = imgResult.images.length;
        timings['buscador_visual'] = {
          latencyMs: t3 - t2,
          inputTokens: estTokens(enrichedQuery),
          outputTokens: 0,
          costUsd: costTokens('text-embedding-3-small', estTokens(enrichedQuery), 0),
        };

        const t4 = performance.now();
        const curadorResult = await runCurador(
          docResult.chunks, imgResult.images, q.question_text, model
        );
        const t5 = performance.now();
        timings['curador'] = {
          latencyMs: t5 - t4, inputTokens: 0, outputTokens: 0, costUsd: 0,
        };

        groundTruth = curadorResult.groundTruth;
        validatedImages = curadorResult.validatedImages;
        chunksRetrieved = curadorResult.chunksRetrieved;
        hasEnrichments = curadorResult.hasEnrichments;
        bestDistance = curadorResult.bestDistance;
        componentMismatch = curadorResult.componentMismatch;
        rescueUsed = curadorResult.rescueUsed;
        docsConsultados = curadorResult.docsConsultados;
      } catch (e) {
        console.error(`    [WARN] Retrieval falló:`, (e as Error).message);
      }

      /* ── FASE 2 — ANALISTA + REACT LOOP ────────────────────────────────── */
      async function ejecutarAnalista(loopIndex: number) {
        if (componentMismatch || rescueUsed) {
          return {
            output: {
              root_cause_hypothesis: 'Alimentación no detectada en el componente indicado.',
              confidence: 0.6,
              requires_verification: true,
              next_step: 'Verificar alimentación general y estado del circuito de seguridad.',
              response_mode: 'TROUBLESHOOTING',
              needs_more_info: false,
              gap: null,
            },
            totalTokens: 0,
          };
        }
        return runAnalista({
          userQuery: enrichedQuery,
          groundTruth,
          imageContext: '',
          intent: queryIntent,
          historyContext: '',
          loopIndex,
          modo,
          componentMismatch,
          rescueUsed,
          entities: entitiesForSearch,
        });
      }

      if (cfg.analista_enabled) {
        try {
          const t0 = performance.now();
          const result = await ejecutarAnalista(0);
          const t1 = performance.now();
          analistaOutput = result.output;
          timings['analista'] = {
            latencyMs: t1 - t0,
            inputTokens: result.usage?.promptTokens ?? 0,
            outputTokens: result.usage?.completionTokens ?? 0,
            costUsd: costTokens('gpt-4o-mini', result.usage?.promptTokens ?? 0, result.usage?.completionTokens ?? 0),
          };
        } catch (e) {
          console.error(`    [WARN] Analista falló:`, (e as Error).message);
        }
      }

      /* ── REACT LOOP ────────────────────────────────────────────────────── */
      let loopIndex = 0;
      while (flags.react_loop && loopIndex < 2 && shouldLoop(analistaOutput, loopIndex, loopHistory)) {
        loopHistory.push({
          loopIndex,
          confidence: analistaOutput.confidence,
          gap: analistaOutput.gap,
          chunks_used: [],
        });
        loopIndex++;
        totalLoopsUsed++;

        try {
          const t0 = performance.now();
          const plan = await runPlanner({
            query: q.question_text,
            intent: queryIntent,
            entities: entitiesForSearch,
            loopIndex,
            analystFeedback: {
              gap: analistaOutput.gap!,
              confidence: analistaOutput.confidence,
            },
            searchMemory: { previous_queries: [], previous_chunk_ids: [] },
          }, model);
          const t1 = performance.now();
          const planUsage = (plan as any)._usage;
          plannerTimings.push({
            latencyMs: t1 - t0,
            inputTokens: planUsage?.promptTokens ?? 0,
            outputTokens: planUsage?.completionTokens ?? 0,
            costUsd: costTokens('gpt-4o-mini', planUsage?.promptTokens ?? 0, planUsage?.completionTokens ?? 0),
          });

          const docResult = await runBuscadorDocumental(
            (plan as any).text_query, model, queryIntent as any, entitiesForSearch
          );
          const docIds = [...new Set(docResult.chunks.map((c: any) => c.document_id))];
          const imgResult = await runBuscadorVisual((plan as any).image_query, docIds, model);
          const curadorResult = await runCurador(
            docResult.chunks, imgResult.images, q.question_text, model
          );

          groundTruth = groundTruth
            ? `${groundTruth}\n\n--- INFORMACIÓN ADICIONAL (Iteración ${loopIndex}) ---\n\n${curadorResult.groundTruth}`
            : curadorResult.groundTruth;
          validatedImages = curadorResult.validatedImages;
          chunksRetrieved += curadorResult.chunksRetrieved;
          hasEnrichments = hasEnrichments || curadorResult.hasEnrichments;
          bestDistance = Math.min(bestDistance, curadorResult.bestDistance);
          componentMismatch = componentMismatch || curadorResult.componentMismatch;
          rescueUsed = rescueUsed || curadorResult.rescueUsed;
          docsConsultados = curadorResult.docsConsultados;

          const analyzeResult = await ejecutarAnalista(loopIndex);
          analistaOutput = analyzeResult.output;
          if (timings['analista']) {
            timings['analista'].latencyMs += performance.now() - t0;
            timings['analista'].inputTokens += analyzeResult.usage?.promptTokens ?? 0;
            timings['analista'].outputTokens += analyzeResult.usage?.completionTokens ?? 0;
            timings['analista'].costUsd += costTokens(
              'gpt-4o-mini',
              analyzeResult.usage?.promptTokens ?? 0,
              analyzeResult.usage?.completionTokens ?? 0
            );
          }
        } catch (e) {
          console.error(`    [WARN] Re-loop ${loopIndex} falló:`, (e as Error).message);
          break;
        }
      }

      /* ── FASE 2.5 — VERIFICADOR ────────────────────────────────────────── */
      const shouldVerify = flags.verifier
        && (analistaOutput.gap === null || !analistaOutput.needs_more_info);
      if (shouldVerify) {
        try {
          const t0 = performance.now();
          const verifierResult = await runVerifier(groundTruth, analistaOutput.root_cause_hypothesis);
          const t1 = performance.now();
          verifierValid = verifierResult.data.is_valid;
          timings['verifier'] = {
            latencyMs: t1 - t0,
            inputTokens: verifierResult.usage.promptTokens,
            outputTokens: verifierResult.usage.completionTokens,
            costUsd: costTokens('gpt-4o-mini', verifierResult.usage.promptTokens, verifierResult.usage.completionTokens),
          };
          if (!verifierResult.data.is_valid) {
            analistaOutput.root_cause_hypothesis = verifierResult.data.safe_fallback_response;
            analistaOutput.confidence = Math.min(analistaOutput.confidence, verifierResult.data.confidence_score);
          }
        } catch (e) {
          console.error(`    [WARN] Verifier falló:`, (e as Error).message);
        }
      }

      /* ── FASE 3 — CHIEF ENGINEER (generateText no streaming) ────────────── */
      let responseText = '';
      try {
        const contextBlock = groundTruth.trim()
          ? `DOCUMENTACIÓN TÉCNICA:\n${groundTruth}`
          : 'DOCUMENTACIÓN TÉCNICA: No se encontró documentación relacionada con este síntoma.';

        const t3start = performance.now();
        const chiefResult = await generateText({
          model: openai('gpt-4o-mini'),
          messages: [
            {
              role: 'system',
              content: modo === 'diagnostico' ? PROMPT_DIAGNOSTICO : PROMPT_MENTOR_V2,
            },
            {
              role: 'user',
              content:
                `SÍNTOMA: ${enrichedQuery}\n\n` +
                `${contextBlock}\n\n` +
                `IMÁGENES DISPONIBLES:\n${
                  validatedImages.map((img: any) =>
                    `URL: ${img.url} | Descripción: ${img.description}`
                  ).join('\n') || 'No hay imágenes disponibles para este caso.'
                }\n\n` +
                `ANÁLISIS TÉCNICO:\n` +
                (componentMismatch || rescueUsed
                  ? 'ESTADO: Aplicando protocolo de verificación base.'
                  : analistaOutput.needs_more_info || analistaOutput.confidence < 0.5
                    ? 'ESTADO: Información insuficiente para diagnóstico preciso.'
                    : `HIPÓTESIS: ${analistaOutput.root_cause_hypothesis}. PASO SIGUIENTE: ${analistaOutput.next_step}.`
                ),
            },
          ],
        });
        const t3end = performance.now();
        responseText = chiefResult.text;

        timings['chief_engineer'] = {
          latencyMs: t3end - t3start,
          inputTokens: chiefResult.usage?.promptTokens ?? 0,
          outputTokens: chiefResult.usage?.completionTokens ?? 0,
          costUsd: costTokens('gpt-4o-mini',
            chiefResult.usage?.promptTokens ?? 0,
            chiefResult.usage?.completionTokens ?? 0
          ),
        };
      } catch (e) {
        console.error(`    [WARN] Chief Engineer falló:`, (e as Error).message);
        responseText = `[ERROR] ${(e as Error).message}`;
      }

      const totalPipelineMs = performance.now() - startTotal;

      /* ── LLM-as-JUDGE (inline con GPT-4o) ──────────────────────────────── */
      let judgeResult = {
        score_correctness: 0, score_completeness: 0, score_relevance: 0,
        score_clarity: 0, score_ablation_impact: 0,
        score_factual: 0, score_diagnostic: 0,
        score_total: 0,
        factual_errors: [] as string[],
        diagnostic_value: '',
        safe_decision_rate: 0,
        judge_reasoning: '',
        judge_input_tokens: 0,
        judge_output_tokens: 0,
        judge_cost_usd: 0,
        judge_ms: 0,
      };

      try {
        const disabled: string[] = [];
        if (!cfg.clarifier_enabled) disabled.push('Clarificador');
        if (!cfg.analista_enabled) disabled.push('Analista');
        if (!cfg.planner_enabled) disabled.push('Planificador');
        if (!flags.semantic_router) disabled.push('Enrutador Semántico');
        if (!flags.verifier) disabled.push('Verificador');
        if (!flags.react_loop) disabled.push('React Loop');

        const loopInfo = `Ejecución finalizada en ${totalLoopsUsed} loop(s). ` +
          (analistaOutput.gap === null
            ? 'Búsqueda directa sin necesidad de re-planificación.'
            : 'Se detectaron gaps de información.');

        const judgeSystemPrompt =
          `Eres evaluador de un asistente técnico para técnicos de ascensores Schindler.
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

        const judgeUserPrompt = [
          `PREGUNTA DEL TÉCNICO:\n${q.question_text}`,
          `\nGROUND TRUTH (FACUAL CORE):\n${q.ground_truth}`,
          q.reasoning_indicators
            ? `\nINDICADORES DE RAZONAMIENTO ESPERADOS:\n${q.reasoning_indicators}`
            : '',
          `\nRESPUESTA GENERADA — Configuración "${cfg.name}":\n${responseText}`,
          `\nCONTEXTO DE EJECUCIÓN: ${loopInfo}`,
          `\nAGENTES DESHABILITADOS: ${disabled.length ? disabled.join(', ') : 'Ninguno (completo)'}`,
        ].join('');

        const jt0 = performance.now();
        const jRes = await generateText({
          model: openai('gpt-4o'),
          temperature: 0,
          maxTokens: 600,
          messages: [
            { role: 'system', content: judgeSystemPrompt },
            { role: 'user', content: judgeUserPrompt },
          ],
        });
        const jt1 = performance.now();

        const jsonMatch = jRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const sf = (v: unknown, d: number) => typeof v === 'number' ? v : d;
          const factualErrors = Array.isArray(parsed.factual_errors) ? parsed.factual_errors : [];

          judgeResult = {
            score_correctness: sf(parsed.score_correctness, 0),
            score_completeness: sf(parsed.score_completeness, 0),
            score_relevance: sf(parsed.score_relevance, 0),
            score_clarity: sf(parsed.score_clarity, 0),
            score_ablation_impact: sf(parsed.score_ablation_impact, 0),
            score_factual: sf(parsed.score_factual, 0),
            score_diagnostic: sf(parsed.score_diagnostic, 0),
            score_total: (sf(parsed.score_factual, 0) * 0.5) + (sf(parsed.score_diagnostic, 0) * 0.5),
            factual_errors: factualErrors,
            diagnostic_value: typeof parsed.diagnostic_value_explanation === 'string'
              ? parsed.diagnostic_value_explanation : '',
            safe_decision_rate: sf(parsed.safe_decision_rate, 0),
            judge_reasoning: typeof parsed.judge_reasoning === 'string' ? parsed.judge_reasoning : '',
            judge_input_tokens: jRes.usage?.promptTokens ?? 0,
            judge_output_tokens: jRes.usage?.completionTokens ?? 0,
            judge_cost_usd: costTokens('gpt-4o',
              jRes.usage?.promptTokens ?? 0, jRes.usage?.completionTokens ?? 0
            ),
            judge_ms: jt1 - jt0,
          };
        }
      } catch (e) {
        console.error(`    [WARN] Judge falló:`, (e as Error).message);
      }

      /* ── Ensamblar fila ────────────────────────────────────────────────── */
      const g = (k: string) => timings[k] ?? { latencyMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      const totalIn = Object.values(timings).reduce((s, t) => s + t.inputTokens, 0);
      const totalOut = Object.values(timings).reduce((s, t) => s + t.outputTokens, 0);
      const totalCost = Object.values(timings).reduce((s, t) => s + t.costUsd, 0) + judgeResult.judge_cost_usd;

      const row: ExperimentRow = {
        index: idx,
        question_id: qId, question_category: q.category, question_text: q.question_text,
        difficulty: q.difficulty, equipment_model: model, ground_truth: q.ground_truth,
        config_id: cfgId, config_name: cfg.name || cfgId,
        response: responseText, timestamp,

        clarifier_ms: g('clarifier').latencyMs,
        semantic_router_ms: g('semantic_router').latencyMs,
        buscador_documental_ms: g('buscador_documental').latencyMs,
        buscador_visual_ms: g('buscador_visual').latencyMs,
        curador_ms: g('curador').latencyMs,
        analista_ms: g('analista').latencyMs,
        planner_loops_ms: plannerTimings.map(pt => pt.latencyMs),
        verifier_ms: g('verifier').latencyMs,
        chief_engineer_ms: g('chief_engineer').latencyMs,
        total_pipeline_ms: totalPipelineMs,

        clarifier_input_tokens: g('clarifier').inputTokens,
        clarifier_output_tokens: g('clarifier').outputTokens,
        semantic_router_input_tokens: g('semantic_router').inputTokens,
        semantic_router_output_tokens: g('semantic_router').outputTokens,
        buscador_documental_embed_tokens: g('buscador_documental').inputTokens,
        buscador_visual_embed_tokens: g('buscador_visual').inputTokens,
        analista_input_tokens: g('analista').inputTokens,
        analista_output_tokens: g('analista').outputTokens,
        planner_input_tokens: plannerTimings.reduce((s, pt) => s + pt.inputTokens, 0),
        planner_output_tokens: plannerTimings.reduce((s, pt) => s + pt.outputTokens, 0),
        verifier_input_tokens: g('verifier').inputTokens,
        verifier_output_tokens: g('verifier').outputTokens,
        chief_engineer_input_tokens: g('chief_engineer').inputTokens,
        chief_engineer_output_tokens: g('chief_engineer').outputTokens,
        total_input_tokens: totalIn,
        total_output_tokens: totalOut,

        cost_clarifier_usd: g('clarifier').costUsd,
        cost_semantic_router_usd: g('semantic_router').costUsd,
        cost_buscadores_embed_usd: g('buscador_documental').costUsd + g('buscador_visual').costUsd,
        cost_analista_usd: g('analista').costUsd,
        cost_planner_usd: plannerTimings.reduce((s, pt) => s + pt.costUsd, 0),
        cost_verifier_usd: g('verifier').costUsd,
        cost_chief_engineer_usd: g('chief_engineer').costUsd,
        cost_total_usd: totalCost,

        loop_count: totalLoopsUsed,
        gap_resolved: analistaOutput.gap === null,
        final_confidence: analistaOutput.confidence,
        loop_stopped_reason: analistaOutput.gap === null ? 'resolved' : 'gap_unresolved',

        chunks_retrieved: chunksRetrieved,
        images_retrieved: imagesRetrievedCount,
        images_shown: validatedImages.length,

        ...judgeResult,
      };

      results.push(row);
      console.log(`    ✓ Hecho (${(totalPipelineMs / 1000).toFixed(1)}s pipeline, ${(judgeResult.judge_ms / 1000).toFixed(1)}s judge)`);

      /* ── Guardado intermedio cada 10 runs ────────────────────────────────── */
      if (idx % 10 === 0) {
        const partialPath = resolve(OUTPUT_DIR, `experimento3_checkpoint_${RUN_BATCH}.json`);
        writeFileSync(partialPath, JSON.stringify(results, null, 2), 'utf8');
        console.log(`    💾 Checkpoint guardado (${results.length} runs hasta ahora)`);
      }

      await sleep(1000);
    }
  }

  /* ── Guardar resultados ──────────────────────────────────────────────────── */
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const jsonPath = resolve(OUTPUT_DIR, `experimento3_resultados_${RUN_BATCH}.json`);
  writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✓ JSON guardado: ${jsonPath}`);

  const csvPath = resolve(OUTPUT_DIR, `experimento3_resultados_${RUN_BATCH}.csv`);
  const csvHeaders = Object.keys(results[0]).join(',');
  const csvRows = results.map(row => {
    return Object.values(row).map(v => {
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
      return String(v);
    }).join(',');
  });
  writeFileSync(csvPath, [csvHeaders, ...csvRows].join('\n'), 'utf8');
  console.log(`✓ CSV guardado: ${csvPath}`);

  /* ── Resumen rápido ──────────────────────────────────────────────────────── */
  const byConfig = new Map<string, ExperimentRow[]>();
  for (const r of results) {
    if (!byConfig.has(r.config_id)) byConfig.set(r.config_id, []);
    byConfig.get(r.config_id)!.push(r);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('RESUMEN POR CONFIGURACIÓN');
  console.log(`${'='.repeat(60)}`);

  for (const [cfgId, rows] of byConfig.entries()) {
    const avgScore = rows.reduce((s, r) => s + r.score_total, 0) / rows.length;
    const avgFactual = rows.reduce((s, r) => s + r.score_factual, 0) / rows.length;
    const avgDiag = rows.reduce((s, r) => s + r.score_diagnostic, 0) / rows.length;
    const avgCost = rows.reduce((s, r) => s + r.cost_total_usd, 0) / rows.length;
    const avgTime = rows.reduce((s, r) => s + r.total_pipeline_ms, 0) / rows.length;
    const avgTokens = rows.reduce((s, r) => s + r.total_input_tokens + r.total_output_tokens, 0) / rows.length;

    console.log(`\n  ${cfgId}:`);
    console.log(`    Score total promedio:  ${(avgScore * 100).toFixed(1)}%`);
    console.log(`    Factual: ${avgFactual.toFixed(2)}/2  |  Diagnóstico: ${avgDiag.toFixed(2)}/2`);
    console.log(`    Coste promedio:  $${avgCost.toFixed(4)}`);
    console.log(`    Latencia promedio: ${(avgTime / 1000).toFixed(1)}s`);
    console.log(`    Tokens promedio:  ${avgTokens.toFixed(0)}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXPERIMENTO COMPLETADO — ${results.length} filas generadas`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
