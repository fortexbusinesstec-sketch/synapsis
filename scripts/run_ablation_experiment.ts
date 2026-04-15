
import { client } from '../lib/db';
import { runLevel0Simulation } from './evaluate_level0';
import { runLevel1Retrieval } from './evaluate_level1';
import { createId } from '@paralleldrive/cuid2';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Importamos los handlers directamente para Nodos React y Juez IA
import { POST as ChatPOST } from '../app/api/chat/route';
import { POST as JudgePOST } from '../app/api/ablation/judge/route';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function parseVercelDataStream(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return '';
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    
    // Parse Vercel AI stream parts: "0:\"texto\""
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('0:')) {
        try {
          const parsed = JSON.parse(line.substring(2));
          if (typeof parsed === 'string') {
            fullText += parsed;
          }
        } catch {
          // ignore parsing errors on fragmented lines (simplified)
        }
      }
    }
  }
  return fullText;
}

export async function runAblationExperiment(runBatch: string, targetConfigs: string[]) {
  console.log(`\n=== INICIANDO MASTER BATCH RUNNER ===`);
  console.log(`Lote: ${runBatch}`);
  console.log(`Configs a evaluar: [${targetConfigs.join(', ')}]`);

  // 1. Obtener panel de configuraciones desde la BD
  console.log(`\n[+] Cargando configuraciones de la BD...`);
  const configsRes = await client.execute(`SELECT * FROM ablation_configurations`);
  const configsMap = new Map();
  for (const c of configsRes.rows) {
    configsMap.set(c.id as string, c);
  }

  // 2. Obtener preguntas activas
  console.log(`[+] Obteniendo preguntas activas...`);
  const qRes = await client.execute(`
    SELECT * FROM ablation_questions 
    WHERE is_active = 1 
    ORDER BY id ASC
  `);
  const questions = qRes.rows;
  console.log(`[+] Encontradas ${questions.length} preguntas activas.\n`);

  // 3. Iterar sobre preguntas
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qId = q.id as string;
    const qText = q.question_text as string;
    const model = (q.equipment_model as string) || '3300';
    const groundTruth = q.ground_truth as string;

    console.log(`\n[${i + 1}/${questions.length}] Evaluando Pregunta: ${qId} -> ${qText}`);

    // Iterar sobre configs
    for (const rawConfigId of targetConfigs) {
      const configId = rawConfigId === 'L0' ? 'config_goms' :
                       rawConfigId === 'L1' ? 'config_bm25_bert' :
                       rawConfigId;

      console.log(`  -> Configuración: ${rawConfigId} (mapped: ${configId})`);

      // Idempotencia: Saltar si ya está procesado
      const doneRes = await client.execute({
        sql: `SELECT id FROM ablation_runs WHERE question_id=? AND config_id=? AND run_batch=? AND status='done'`,
        args: [qId, configId, runBatch]
      });

      if (doneRes.rows.length > 0) {
        console.log(`     [SALTADO] Ya existe un run exitoso para (${qId}, ${configId}, ${runBatch})`);
        continue;
      }

      // Try-Catch Global para Tolerancia a Fallos
      try {
        if (configId === 'config_goms') {
          // Motor Simulación Humana GOMS
          await sleep(2000); // Rate limiter
          await runLevel0Simulation({
            questionId: qId,
            query: qText,
            equipmentModel: model,
            runIndex: i + 1,
            runBatch,
            groundTruth,
            configId
          });
          console.log(`     [OK] Nivel 0 Completado.`);

        } else if (configId === 'config_bm25_bert') {
          // Motor BM25 + BERT (Dos etapas)
          await sleep(2000); // Rate limiter
          const t0 = Date.now();
          const l1Res = await runLevel1Retrieval(qText);
          
          // Generar una respuesta base usando el recuperador
          const contextBlocks = l1Res.results.map((r, idx) => `[Doc ${idx+1}]\n${r.content}`).join('\n\n');
          
          // Sintetizar respuesta básica de LLM (RAG tradicional simple)
          const llmRes = await generateText({
            model: openai('gpt-4o-mini'),
            temperature: 0,
            system: "Eres un chatbot de diagnóstico. Usa ÚNICAMENTE el contexto provisto para responder. Si no lo sabes, di que no sabes.",
            prompt: `PREGUNTA: ${qText}\n\nCONTEXTO:\n${contextBlocks}`
          });
          
          const responseText = llmRes.text;
          const totalMs = Date.now() - t0;
          const inputTokens = llmRes.usage.promptTokens ?? 0;
          const outputTokens = llmRes.usage.completionTokens ?? 0;
          const costUsd = ((inputTokens * 0.15) + (outputTokens * 0.60)) / 1_000_000;

          const runId = createId();
          await client.execute({
            sql: `
              INSERT INTO ablation_runs (
                id, question_id, config_id, run_batch, run_index, status,
                chunks_retrieved, phase1_ms, total_ms, cost_usd, 
                response_text, loop_stopped_reason, created_at
              ) VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, ?, 'resolved', unixepoch())
            `,
            args: [
              runId, qId, configId, runBatch, i + 1,
              l1Res.results.length,
              l1Res.executionTimeMs, totalMs, costUsd,
              responseText
            ]
          });

          // Llamar al juez
          await JudgePOST(new Request('http://localhost:3000/api/ablation/judge', {
            method: 'POST',
            body: JSON.stringify({ runId })
          }));

          console.log(`     [OK] Nivel 1 Completado (runId: ${runId})`);

        } else {
          // Para Nivel 3 / Config D, B... usamos el pipeline React NextJS via route.ts
          const conf = configsMap.get(configId);
          if (!conf) {
            console.error(`     [ERROR] Configuración '${configId}' no encontrada en la BD.`);
            continue;
          }

          const agentFlags = {
            clarifier: Boolean(conf.clarifier_enabled),
            planner: Boolean(conf.planner_enabled),
            bibliotecario: Boolean(conf.bibliotecario_enabled),
            selector: Boolean(conf.selector_enabled),
            analista: Boolean(conf.analista_enabled),
            images: Boolean(conf.images_enabled),
            enrichments: Boolean(conf.enrichments_enabled),
            metrifier: false // No ensuciar chat_messages de DB
          };

          const sessionId = `abl_${runBatch}_${configId}_${qId}`;
          const tStart = Date.now();

          await sleep(2000); // Rate limit protection
          const req = new Request('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: qText }],
              equipmentModel: model,
              sessionId,
              sessionMode: 'test',
              agentFlags
            })
          });

          const chatRes = await ChatPOST(req);
          
          if (!chatRes.ok || !chatRes.body) {
             throw new Error(`Chat API retornó status ${chatRes.status}`);
          }

          // Extraer headers para la telemetría
          const responseText = await parseVercelDataStream(chatRes.body);
          const tTotalMs = Date.now() - tStart;

          const h = chatRes.headers;

          // --- Latencias ---
          const phase1Ms   = parseInt(h.get('x-phase1-ms')  || '0', 10);
          const phase2Ms   = parseInt(h.get('x-phase2-ms')  || '0', 10);
          const phase3Ms   = parseInt(h.get('x-phase3-ms')  || '0', 10);

          // --- Tokens ---
          const phase2Tokens       = parseInt(h.get('x-phase2-tokens')        || '0', 10);
          const phase3InputTokens  = parseInt(h.get('x-phase3-input-tokens')  || '0', 10);
          const phase3OutputTokens = parseInt(h.get('x-phase3-output-tokens') || '0', 10);

          // --- Trazabilidad RAG ---
          const chunksRetrieved  = parseInt(h.get('x-chunks-retrieved') || '0', 10);
          const imagesRetrieved  = parseInt(h.get('x-images-retrieved') || '0', 10);
          const imagesShown      = parseInt(h.get('x-images-shown')     || '0', 10);
          const enrichmentsUsed  = parseInt(h.get('x-enrichments-used') || '0', 10);

          // --- Telemetría de agentes ---
          const enrichedQuery   = decodeURIComponent(h.get('x-enriched-query')  || '');
          const detectedIntent  = h.get('x-detected-intent')  || '';
          const detectedUrgency = h.get('x-urgency-level')    || '';
          const responseMode    = h.get('x-response-mode')    || 'TROUBLESHOOTING';

          // --- Telemetría del Loop Engine (opcional — presente solo en configs con planner) ---
          const loopsUsed        = parseInt(h.get('x-loops-used')         || '1', 10);
          const selectorKept     = parseInt(h.get('x-selector-kept')      || '0', 10);
          const plannerQueriesList = h.get('x-planner-queries')           || '[]';
          const finalConfidence  = parseFloat(h.get('x-final-confidence') || '0.0');
          const redundantAvoided = parseInt(h.get('x-redundant-avoided')  || '0', 10);
          const gapTypesSeen     = h.get('x-gap-types-seen')              || '[]';
          const gapResolved      = h.get('x-gap-resolved') === '1' ? 1 : 0;
          const loopStoppedReason = h.get('x-loop-stopped-reason')        || 'resolved';

          // --- Costo real usando tokens reportados por el endpoint ---
          // gpt-4o-mini (Fase 2): $0.15/M input + $0.60/M output
          // gpt-4o      (Fase 3): $2.50/M input + $10.00/M output
          const costUsd =
            (phase2Tokens      * 0.15  / 1_000_000) +   // fase2 input (mini)
            (phase3InputTokens  * 2.50  / 1_000_000) +   // fase3 input (4o)
            (phase3OutputTokens * 10.00 / 1_000_000);    // fase3 output (4o)

          const runId = createId();

          await client.execute({
            sql: `
              INSERT INTO ablation_runs (
                id, question_id, config_id, run_batch, run_index, status,
                enriched_query, detected_intent, detected_urgency,
                chunks_retrieved, images_retrieved, images_shown, enrichments_used,
                phase1_ms, phase2_ms, phase3_ms, total_ms,
                cost_usd, phase2_tokens, phase3_input_tokens, phase3_output_tokens,
                response_text, loop_count,
                planner_queries, selector_kept, final_confidence, redundant_chunks_avoided,
                gap_types_seen, gap_resolved, loop_stopped_reason, response_mode,
                created_at
              ) VALUES (
                ?, ?, ?, ?, ?, 'done',
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                unixepoch()
              )
            `,
            args: [
              runId, qId, configId, runBatch, i + 1,
              enrichedQuery, detectedIntent, detectedUrgency,
              chunksRetrieved, imagesRetrieved, imagesShown, enrichmentsUsed,
              phase1Ms, phase2Ms, phase3Ms, tTotalMs,
              costUsd, phase2Tokens, phase3InputTokens, phase3OutputTokens,
              responseText, loopsUsed,
              plannerQueriesList, selectorKept, finalConfidence, redundantAvoided,
              gapTypesSeen, gapResolved, loopStoppedReason, responseMode
            ]
          });

          // Conectar con el Juez IA
          await sleep(2000); // Rate limiter before judge
          const judgeReq = new Request('http://localhost:3000/api/ablation/judge', {
            method: 'POST',
            body: JSON.stringify({ runId })
          });
          const judgeRes = await JudgePOST(judgeReq);
          
          if (!judgeRes.ok) {
             console.error(`     [WARN] Juez retornó status no ok: ${judgeRes.status}`);
          } else {
             const judgeData = await judgeRes.json();
             console.log(`     [OK] Chat y Juez Completado (Score: ${judgeData.scoreTotal})`);
          }
        }

      } catch (error) {
        const errMsg = (error as Error).message;
        console.error(`     [ERROR CRÍTICO] Ocurrió un error en (${qId}, ${configId}):`, errMsg);

        // Guardar error para no bloquear el runner
        const errRunId = createId();
        await client.execute({
          sql: `
            INSERT INTO ablation_runs (
              id, question_id, config_id, run_batch, run_index, status, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, 'error', ?, unixepoch())
          `,
          args: [errRunId, qId, configId, runBatch, i + 1, errMsg]
        });
      }
    }
  }

  console.log(`\n=== EXPERIMENTO ABLATION COMPLETADO ===`);
}

if (require.main === module) {
  const batch = process.argv[2] || 'pilot_v1';
  
  // El usuario solicitó específicamente ['L0', 'L1', 'config_D', 'config_B'] pero en DB 
  // los configId pueden ser 'L0', 'L1', 'D', 'B' etc. Se aceptan del CLI.
  let targetConfigs = process.argv.slice(3);
  if (targetConfigs.length === 0) {
    targetConfigs = ['L0', 'L1', 'D', 'B']; // valores predeterminados de la solicitud
  }

  runAblationExperiment(batch, targetConfigs)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
