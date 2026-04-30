/**
 * Re-ejecuta el Agente Curioso en TODOS los documentos para recalcular herencias L2/L3
 * con el nuevo umbral semántico (0.25).
 * 
 * El agente NO duplicará lagunas gracias al Nivel 0 (anti-redundancia intra-documento).
 * Solo buscará si las lagunas YA existentes pueden heredar respuestas de otros documentos.
 */
import { db } from '../lib/db';
import { documents, enrichments } from '../lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { client } from '../lib/db';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createId } from '@paralleldrive/cuid2';
import { updateIndexingMetricsSnapshot } from '../lib/agents/curious';

async function rerunInheritance() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Re-evaluación de Herencia L2/L3 — Todos los docs');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Obtener todos los documentos
  const allDocs = await db.select({
    id: documents.id,
    title: documents.title,
    equipmentModel: documents.equipmentModel,
  }).from(documents);

  console.log(`Documentos encontrados: ${allDocs.length}\n`);

  let totalL1 = 0, totalL2 = 0, totalL3 = 0;

  for (const doc of allDocs) {
    console.log(`\n── Procesando: "${doc.title}" (${doc.id}) ──`);
    
    // 2. Buscar lagunas pendientes (sin respuesta) de este documento
    const pendingGaps = await client.execute({
      sql: `SELECT id, generated_question, question_context
            FROM enrichments
            WHERE document_id = ? AND is_verified = 0 AND answer_source = 'pending'`,
      args: [doc.id],
    });

    if (pendingGaps.rows.length === 0) {
      console.log('   → Sin lagunas pendientes. Saltando.');
      continue;
    }

    console.log(`   → ${pendingGaps.rows.length} lagunas pendientes. Buscando herencias...`);
    let docL1 = 0, docL2 = 0, docL3 = 0;

    for (const gap of pendingGaps.rows) {
      const question = gap.generated_question as string;
      const gapId = gap.id as string;

      // Extraer término clave (simplificado)
      const techMatch = question.match(/[A-Z][A-Z0-9]{2,}/);
      const keyTerm = techMatch ? techMatch[0] : question.split(' ').slice(-2).join(' ');

      // ── L1: Coincidencia exacta de término en otro documento ──
      try {
        const l1 = await client.execute({
          sql: `SELECT e.id, e.generated_question, e.expert_answer, e.answer_source
                FROM enrichments e
                WHERE e.is_verified = 1
                  AND e.answer_source != 'inherited'
                  AND e.document_id != ?
                  AND e.generated_question LIKE ?
                LIMIT 1`,
          args: [doc.id, `%${keyTerm}%`],
        });
        if (l1.rows.length > 0 && (l1.rows[0] as any).expert_answer) {
          const row = l1.rows[0] as any;
          await inheritAndSave(gapId, doc.id, row, 1);
          docL1++;
          continue;
        }
      } catch {}

      // ── L2: Mismo modelo de equipo + término ──
      if (doc.equipmentModel) {
        try {
          const l2 = await client.execute({
            sql: `SELECT e.id, e.generated_question, e.expert_answer, e.answer_source
                  FROM enrichments e
                  JOIN documents d ON d.id = e.document_id
                  WHERE e.is_verified = 1
                    AND e.answer_source != 'inherited'
                    AND e.document_id != ?
                    AND d.equipment_model = ?
                    AND e.generated_question LIKE ?
                  LIMIT 1`,
            args: [doc.id, doc.equipmentModel, `%${keyTerm}%`],
          });
          if (l2.rows.length > 0 && (l2.rows[0] as any).expert_answer) {
            const row = l2.rows[0] as any;
            await inheritAndSave(gapId, doc.id, row, 2);
            docL2++;
            continue;
          }
        } catch {}
      }

      // ── L3: Similitud semántica (embeddings) ──
      try {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: question,
        });
        const queryVector = new Uint8Array(new Float32Array(embedding).buffer);

        const l3 = await client.execute({
          sql: `SELECT id, generated_question, expert_answer, answer_source,
                  vector_distance_cos(embedding, vector32(?)) as distance
                FROM enrichments
                WHERE is_verified = 1
                  AND answer_source != 'inherited'
                  AND document_id != ?
                  AND embedding IS NOT NULL
                ORDER BY distance
                LIMIT 1`,
          args: [queryVector, doc.id],
        });

        if (l3.rows.length > 0) {
          const row = l3.rows[0] as any;
          if (row.distance < 0.25 && row.expert_answer) {
            await inheritAndSave(gapId, doc.id, row, 3);
            docL3++;
            console.log(`      L3 match (dist: ${row.distance.toFixed(3)}): "${question.slice(0, 60)}…"`);
            continue;
          }
        }
      } catch (err) {
        // L3 puede fallar si hay vectores corruptos, no es bloqueante
      }
    }

    console.log(`   Resultados: L1=${docL1}, L2=${docL2}, L3=${docL3}`);
    totalL1 += docL1;
    totalL2 += docL2;
    totalL3 += docL3;

    // Actualizar métricas del documento
    await updateIndexingMetricsSnapshot(doc.id);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RESUMEN GLOBAL`);
  console.log(`  L1 (Exactas):    ${totalL1}`);
  console.log(`  L2 (Modelo):     ${totalL2}`);
  console.log(`  L3 (Semántica):  ${totalL3}`);
  console.log(`  Total heredadas: ${totalL1 + totalL2 + totalL3}`);
  console.log('═══════════════════════════════════════════════════');
}

async function inheritAndSave(
  gapId: string,
  documentId: string,
  source: { expert_answer: string; generated_question: string },
  level: number,
) {
  // Vectorizar la respuesta heredada
  const textToEmbed = `Pregunta: ${source.generated_question} | Respuesta: ${source.expert_answer}`;
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: textToEmbed,
  });

  // Actualizar el enriquecimiento existente en lugar de crear uno nuevo
  await client.execute({
    sql: `UPDATE enrichments 
          SET expert_answer = ?, 
              answer_source = 'inherited', 
              is_verified = 1, 
              inheritance_level = ?,
              embedding = vector32(?),
              answer_length_tokens = ?,
              reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      source.expert_answer,
      level,
      new Uint8Array(new Float32Array(embedding).buffer),
      Math.round(source.expert_answer.length / 4),
      gapId,
    ],
  });
}

rerunInheritance().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
