/**
 * SYNAPSE — Retry Script para config_bm25_bert
 *
 * Reprocessa ÚNICAMENTE los ablation_runs con:
 *   config_id = 'config_bm25_bert'
 *   status     = 'error'
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/retry_bm25_errors.ts [run_batch]
 *
 * Si no se especifica run_batch, reprocessa TODOS los error-runs de config_bm25_bert
 * sin importar el batch.
 */

import { client } from '../lib/db';
import { runLevel1Retrieval } from './evaluate_level1';
import { createId } from '@paralleldrive/cuid2';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { POST as JudgePOST } from '../app/api/ablation/judge/route';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function retryBM25Errors() {
    // Argumentos CLI opcionales
    const runBatch = process.argv[2]; // ej: "pilot_v1". Si no se pasa, reprocessa todos los batches.

    // 1. Consultar los runs fallidos
    let sql: string;
    let args: (string | null)[];

    if (runBatch) {
        console.log(`\n=== RETRY BM25 ERRORS (batch: ${runBatch}) ===`);
        sql = `
      SELECT ar.id         AS run_id,
             ar.question_id,
             ar.run_batch,
             ar.run_index,
             aq.question_text,
             aq.equipment_model,
             aq.ground_truth
        FROM ablation_runs ar
        JOIN ablation_questions aq ON aq.id = ar.question_id
       WHERE ar.config_id = 'config_bm25_bert'
         AND ar.status    = 'error'
         AND ar.run_batch = ?
       ORDER BY ar.run_index ASC
    `;
        args = [runBatch];
    } else {
        console.log(`\n=== RETRY BM25 ERRORS (todos los batches) ===`);
        sql = `
      SELECT ar.id         AS run_id,
             ar.question_id,
             ar.run_batch,
             ar.run_index,
             aq.question_text,
             aq.equipment_model,
             aq.ground_truth
        FROM ablation_runs ar
        JOIN ablation_questions aq ON aq.id = ar.question_id
       WHERE ar.config_id = 'config_bm25_bert'
         AND ar.status    = 'error'
       ORDER BY ar.run_batch, ar.run_index ASC
    `;
        args = [];
    }

    const failedRes = await client.execute({ sql, args });
    const failedRuns = failedRes.rows;

    if (failedRuns.length === 0) {
        console.log('[+] No hay runs con error para config_bm25_bert. Nada que hacer.');
        return;
    }

    console.log(`[+] Encontrados ${failedRuns.length} runs fallidos para reprocessar.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < failedRuns.length; i++) {
        const row = failedRuns[i];
        const oldRunId = row.run_id as string;
        const qId = row.question_id as string;
        const batch = row.run_batch as string;
        const runIndex = row.run_index as number;
        const qText = row.question_text as string;
        const model = (row.equipment_model as string) || '3300';
        const groundTruth = row.ground_truth as string;

        console.log(`\n[${i + 1}/${failedRuns.length}] Reprocessando Q:${qId} (batch: ${batch}, index: ${runIndex})`);
        console.log(`  Pregunta: ${qText}`);

        // Guardia de idempotencia: si ya existe un run 'done' para esta pregunta+batch, saltar.
        const doneCheck = await client.execute({
            sql: `SELECT id FROM ablation_runs
             WHERE question_id=?
               AND config_id='config_bm25_bert'
               AND run_batch=?
               AND status='done'`,
            args: [qId, batch]
        });

        if (doneCheck.rows.length > 0) {
            console.log(`  [SALTADO] Ya existe un run exitoso para (${qId}, ${batch}). Archivando error...`);
            // Marcar el run de error como 'superseded' para mantener el historial limpio
            await client.execute({
                sql: `UPDATE ablation_runs SET status='superseded' WHERE id=?`,
                args: [oldRunId]
            });
            continue;
        }

        try {
            await sleep(2000); // Rate limiter

            const t0 = Date.now();
            const l1Res = await runLevel1Retrieval(qText);

            const contextBlocks = l1Res.results
                .map((r, idx) => `[Doc ${idx + 1}]\n${r.content}`)
                .join('\n\n');

            const llmRes = await generateText({
                model: openai('gpt-4o-mini'),
                temperature: 0,
                system: 'Eres un chatbot de diagnóstico. Usa ÚNICAMENTE el contexto provisto para responder. Si no lo sabes, di que no sabes.',
                prompt: `PREGUNTA: ${qText}\n\nCONTEXTO:\n${contextBlocks}`
            });

            const responseText = llmRes.text;
            const totalMs = Date.now() - t0;
            const inputTokens = llmRes.usage.promptTokens ?? 0;
            const outputTokens = llmRes.usage.completionTokens ?? 0;
            const costUsd = ((inputTokens * 0.15) + (outputTokens * 0.60)) / 1_000_000;

            // Insertar nuevo run exitoso
            const newRunId = createId();
            await client.execute({
                sql: `
          INSERT INTO ablation_runs (
            id, question_id, config_id, run_batch, run_index, status,
            chunks_retrieved, phase1_ms, total_ms, cost_usd,
            response_text, loop_stopped_reason, created_at
          ) VALUES (?, ?, 'config_bm25_bert', ?, ?, 'done', ?, ?, ?, ?, ?, 'resolved', unixepoch())
        `,
                args: [
                    newRunId, qId, batch, runIndex,
                    l1Res.results.length,
                    l1Res.executionTimeMs, totalMs, costUsd,
                    responseText
                ]
            });

            // Marcar el run anterior como superseded (mantiene historial auditado)
            await client.execute({
                sql: `UPDATE ablation_runs SET status='superseded' WHERE id=?`,
                args: [oldRunId]
            });

            // Llamar al Juez IA
            await JudgePOST(new Request('http://localhost:3000/api/ablation/judge', {
                method: 'POST',
                body: JSON.stringify({ runId: newRunId })
            }));

            console.log(`  [OK] Completado (newRunId: ${newRunId}, ${totalMs}ms)`);
            successCount++;

        } catch (error) {
            const errMsg = (error as Error).message;
            console.error(`  [ERROR] Falló de nuevo: ${errMsg}`);

            // Actualizar el mensaje de error en el run existente (no crear otro run de error)
            await client.execute({
                sql: `UPDATE ablation_runs SET error_message=?, created_at=unixepoch() WHERE id=?`,
                args: [`[RETRY] ${errMsg}`, oldRunId]
            });

            errorCount++;
        }
    }

    console.log(`\n=== RETRY COMPLETADO ===`);
    console.log(`  ✅ Exitosos : ${successCount}`);
    console.log(`  ❌ Fallidos  : ${errorCount}`);
    console.log(`  ⏭  Saltados  : ${failedRuns.length - successCount - errorCount}`);
}

retryBM25Errors()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
