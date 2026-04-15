/**
 * Agente Curioso — Detección de Lagunas de Conocimiento (Human-in-the-Loop)
 *
 * Se ejecuta DESPUÉS de que el pipeline principal termina (status = 'ready').
 * Revisa los chunks e imágenes técnicas del documento y detecta lagunas
 * de conocimiento que el experto humano puede completar.
 *
 * Antes de insertar una laguna nueva, busca en cascada (3 niveles) si ya
 * existe la respuesta en el sistema y la hereda automáticamente.
 */
import { generateText, embed } from 'ai';
import { openai }              from '@ai-sdk/openai';
import { createId }            from '@paralleldrive/cuid2';

import { client }              from '@/lib/db';
import { db }                  from '@/lib/db';
import { enrichments }         from '@/lib/db/schema';
import { logAgentStart, logAgentEnd, logAgentError } from '@/lib/agents/logger';

/* ── Tipos internos ──────────────────────────────────────────────────────── */

interface GapResult {
  has_gap:    true;
  question:   string;
  context:    string;
  confidence: number;
}

interface NoGapResult {
  has_gap: false;
}

type CuriousResult = GapResult | NoGapResult;

interface ExistingAnswer {
  id:                string;
  generatedQuestion: string;
  expertAnswer:      string;
  answerSource:      string;
  level:             0 | 1 | 2 | 3;  // 0 = mismo documento (redundancia)
}

/* ── System prompt ───────────────────────────────────────────────────────── */

const SYSTEM_PROMPT =
  'Eres el Agente Curioso de un sistema RAG especializado en ascensores ' +
  'Schindler. Tu única tarea es detectar LAGUNAS DE CONOCIMIENTO en ' +
  'fragmentos de manuales técnicos.\n\n' +
  'Una laguna existe cuando el texto menciona:\n' +
  '- Un componente sin explicar su función exacta (ej: "placa SCMAIN", "módulo SDIC")\n' +
  '- Un código, protocolo o error sin definición (ej: "E07", "CAN bus", "fallo F12")\n' +
  '- Un valor o umbral sin contexto (ej: "resistencia nominal", "tensión de referencia")\n' +
  '- Un procedimiento incompleto (pasos que asumen conocimiento previo no presente)\n' +
  '- Una referencia cruzada a otra sección o documento no disponible\n' +
  '- Un acrónimo técnico sin expandir (ej: "LIMAX", "SMLCD", "BIO")\n\n' +
  'IMPORTANTE: Los manuales técnicos SIEMPRE tienen lagunas. Un técnico en campo ' +
  'necesita contexto adicional que el texto asume conocido. Si el fragmento menciona ' +
  'cualquier nombre de placa, código, valor numérico o procedimiento, casi seguro ' +
  'hay algo que clarificar.\n\n' +
  'Si encuentras una laguna, responde con este JSON exacto (sin markdown, sin texto extra):\n' +
  '{\n' +
  '  "has_gap": true,\n' +
  '  "question": "pregunta técnica específica y accionable para un técnico en campo",\n' +
  '  "context": "por qué este dato faltante es crítico para el diagnóstico",\n' +
  '  "confidence": 0.75\n' +
  '}\n\n' +
  'Solo si el fragmento es verdaderamente autoexplicativo y no usa ningún término ' +
  'técnico sin definir, responde:\n' +
  '{ "has_gap": false }';

/* ── Parsear respuesta del LLM ───────────────────────────────────────────── */

function parseGapResponse(text: string): CuriousResult {
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { has_gap: false };

  const parsed = JSON.parse(jsonMatch[0]) as Partial<GapResult & { has_gap: boolean }>;
  if (!parsed.has_gap) return { has_gap: false };
  if (
    typeof parsed.question   !== 'string' ||
    typeof parsed.context    !== 'string' ||
    typeof parsed.confidence !== 'number'
  ) return { has_gap: false };

  return {
    has_gap:    true,
    question:   parsed.question,
    context:    parsed.context,
    confidence: parsed.confidence,
  };
}

/* ── Extrae el término técnico más distintivo de una pregunta ────────────── */

function extractKeyTerm(question: string): string {
  // Prioridad: acrónimo técnico en mayúsculas (más específico)
  const acronymMatch = question.match(/\b([A-Z]{2,}(?:\d+)?)\b/);
  if (acronymMatch) return acronymMatch[1];
  // Fallback: primeras 5 palabras
  return question.split(/\s+/).slice(0, 5).join(' ');
}

/* ── Cascada de búsqueda en 3 niveles ────────────────────────────────────── */

async function findExistingAnswer(
  question:       string,
  equipmentModel: string | null,
  documentId:     string,
): Promise<ExistingAnswer | null> {
  const keyTerm = extractKeyTerm(question);

  // ── Nivel 0: Redundancia en el MISMO documento (evitar preguntar lo mismo 2 veces) ──
  try {
    const l0 = await client.execute({
      sql: `SELECT id, generated_question, expert_answer, answer_source, is_verified
            FROM enrichments
            WHERE document_id = ?
              AND (generated_question LIKE ? OR question_context LIKE ?)
            LIMIT 1`,
      args: [documentId, `%${keyTerm}%`, `%${keyTerm}%`],
    });
    if (l0.rows.length > 0) {
      const row = l0.rows[0] as any;
      return {
        id:                row.id,
        generatedQuestion: row.generated_question,
        expertAnswer:      row.expert_answer || '',
        answerSource:      row.answer_source,
        level:             0,
      };
    }
  } catch (err) {
    console.error('[curious] Error en búsqueda L0:', (err as Error).message);
  }

  // ── Nivel 1: coincidencia exacta de término clave (todos los documentos) ──
  try {
    const l1 = await client.execute({
      sql: `SELECT id, generated_question, expert_answer, answer_source
            FROM enrichments
            WHERE is_verified = 1
              AND answer_source != 'inherited'
              AND document_id != ?
              AND generated_question LIKE ?
            LIMIT 1`,
      args: [documentId, `%${keyTerm}%`],
    });
    if (l1.rows.length > 0) {
      const row = l1.rows[0] as any;
      if (row.expert_answer) {
        return {
          id:                row.id,
          generatedQuestion: row.generated_question,
          expertAnswer:      row.expert_answer,
          answerSource:      row.answer_source,
          level:             1,
        };
      }
    }
  } catch (err) {
    console.error('[curious] Error en búsqueda L1:', (err as Error).message);
  }

  // ── Nivel 2: filtro por modelo de equipo + término clave ─────────────────
  if (equipmentModel) {
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
        args: [documentId, equipmentModel, `%${keyTerm}%`],
      });
      if (l2.rows.length > 0) {
        const row = l2.rows[0] as any;
        if (row.expert_answer) {
          return {
            id:                row.id,
            generatedQuestion: row.generated_question,
            expertAnswer:      row.expert_answer,
            answerSource:      row.answer_source,
            level:             2,
          };
        }
      }
    } catch (err) {
      console.error('[curious] Error en búsqueda L2:', (err as Error).message);
    }
  }

  // ── Nivel 3: búsqueda semántica por similitud de vector ──────────────────
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: question,
    });
    // Turso vector32 expects a blob of the floats.
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
      args: [queryVector, documentId],
    });

    if (l3.rows.length > 0) {
      const row = l3.rows[0] as any;
      // Umbral relajado de 0.15 a 0.25 para permitir herencia semántica real en Paper Q1
      if (row.distance < 0.25 && row.expert_answer) {
        return {
          id:                row.id,
          generatedQuestion: row.generated_question,
          expertAnswer:      row.expert_answer,
          answerSource:      row.answer_source,
          level:             3,
        };
      }
    }
  } catch (err) {
    console.error('[curious] Error en búsqueda L3 (semántica):', (err as Error).message);
  }

  return null;
}

/* ── Insertar enriquecimiento (pending o heredado) ───────────────────────── */

async function insertEnrichmentWithInheritance({
  documentId,
  referenceId,
  referenceType,
  originalExcerpt,
  result,
  pageNumber,
  existing,
}: {
  documentId:      string;
  referenceId:     string;
  referenceType:   'chunk' | 'image';
  originalExcerpt: string;
  result:          GapResult;
  pageNumber:      number | null;
  existing:        ExistingAnswer | null;
}): Promise<'pending' | 'inherited'> {
  if (existing) {
    // Si es Nivel 0 (mismo documento):
    // - Si ya tiene respuesta (is_verified=1), podríamos heredarla, pero el RAG ya la verá.
    // - Si es pendiente, simplemente no insertamos nada más para no saturar al usuario.
    if (existing.level === 0) {
      return 'pending'; // Actuamos como si ya estuviera procesada
    }

    // Vectorizar pregunta + respuesta heredada para futura recuperación RAG
    const textToEmbed = `Pregunta: ${result.question} | Respuesta: ${existing.expertAnswer}`;
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: textToEmbed,
    });

    await db.insert(enrichments).values({
      id:                 createId(),
      documentId,
      referenceId,
      referenceType,
      originalExcerpt,
      generatedQuestion:  result.question,
      questionContext:    result.context,
      confidence:         result.confidence,
      answerSource:       'inherited',
      expertAnswer:       existing.expertAnswer,
      isVerified:         1,
      inheritanceLevel:   existing.level,
      embedding:          embedding,
      answerLengthTokens: Math.round(existing.expertAnswer.length / 4),
      pageNumber,
      reviewedAt:         new Date().toISOString(),
    });
    return 'inherited';
  }

  await db.insert(enrichments).values({
    id:                createId(),
    documentId,
    referenceId,
    referenceType,
    originalExcerpt,
    generatedQuestion: result.question,
    questionContext:   result.context,
    confidence:        result.confidence,
    answerSource:      'pending',
    pageNumber,
  });
  return 'pending';
}

/* ── Agente principal ────────────────────────────────────────────────────── */

export async function runCuriousAgent(documentId: string): Promise<void> {
  const logId = await logAgentStart(
    documentId,
    'curious',
    `Detectando lagunas de conocimiento en documento ${documentId}`,
  );

  let totalInputTokens  = 0;
  let totalOutputTokens = 0;
  let totalReviewed     = 0;

  // Contadores de herencia
  let newPending  = 0;
  let inherited   = 0;
  let exactCount  = 0;  // heredadas por L1
  let metaCount   = 0;  // heredadas por L2
  let semCount    = 0;  // heredadas por L3

  try {
    /* ── 0. Obtener modelo de equipo del documento ─────────────────────── */
    const docResult = await client.execute({
      sql: `SELECT equipment_model FROM documents WHERE id = ? LIMIT 1`,
      args: [documentId],
    });
    const equipmentModel = (docResult.rows[0] as any)?.equipment_model ?? null;

    /* ── 1. Obtener chunks técnicos (máximo 10) ── */
    const chunksResult = await client.execute({
      sql: `SELECT id, content, section_title, chunk_type, page_number
            FROM document_chunks
            WHERE document_id = ?
              AND chunk_type IN ('procedure', 'specification', 'warning', 'table', 'text')
            ORDER BY
              CASE chunk_type
                WHEN 'procedure'     THEN 1
                WHEN 'specification' THEN 2
                WHEN 'warning'       THEN 3
                WHEN 'table'         THEN 4
                ELSE                      5
              END,
              page_number ASC
            LIMIT 10`,
      args: [documentId],
    });

    const chunks = chunksResult.rows as unknown as Array<{
      id:            string;
      content:       string;
      section_title: string | null;
      chunk_type:    string | null;
      page_number:   number | null;
    }>;

    /* ── 2. Obtener imágenes técnicas (máximo 5) ── */
    const imagesResult = await client.execute({
      sql: `SELECT id, description, image_type, image_url, page_number
            FROM extracted_images
            WHERE document_id = ?
              AND image_type IN ('diagram', 'schematic', 'warning', 'table', 'technical_diagram', 'electrical_schema', 'warning_label')
            LIMIT 5`,
      args: [documentId],
    });

    const images = imagesResult.rows as unknown as Array<{
      id:          string;
      description: string | null;
      image_type:  string | null;
      image_url:   string | null;
      page_number: number | null;
    }>;

    /* ── 3. Analizar chunks ── */
    for (const chunk of chunks) {
      totalReviewed++;
      try {
        const userMessage =
          `FRAGMENTO DEL MANUAL (Sección: ${chunk.section_title ?? 'Sin título'}, ` +
          `Página: ${chunk.page_number ?? '?'}):\n${chunk.content}`;

        const { text, usage } = await generateText({
          model:     openai('gpt-4o-mini'),
          maxTokens: 300,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userMessage   },
          ],
        });

        totalInputTokens  += usage.promptTokens;
        totalOutputTokens += usage.completionTokens;

        const result = parseGapResponse(text);
        if (result.has_gap && result.confidence >= 0.65) {
          const existing = await findExistingAnswer(result.question, equipmentModel, documentId);
          const outcome  = await insertEnrichmentWithInheritance({
            documentId,
            referenceId:     chunk.id,
            referenceType:   'chunk',
            originalExcerpt: chunk.content.slice(0, 200),
            result,
            pageNumber:      chunk.page_number ?? null,
            existing,
          });
          if (outcome === 'inherited') {
            inherited++;
            if      (existing!.level === 1) exactCount++;
            else if (existing!.level === 2) metaCount++;
            else                            semCount++;
          } else if (!existing || existing.level !== 0) {
            newPending++;
          }
        }
      } catch (chunkErr) {
        console.error(`[curious] Error en chunk ${chunk.id}:`, (chunkErr as Error).message);
      }
    }

    /* ── 4. Analizar imágenes ── */
    for (const image of images) {
      if (!image.description) continue;
      totalReviewed++;
      try {
        const userMessage =
          `DESCRIPCIÓN DE IMAGEN TÉCNICA (Tipo: ${image.image_type ?? 'desconocido'}):\n` +
          image.description;

        const { text, usage } = await generateText({
          model:     openai('gpt-4o-mini'),
          maxTokens: 300,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userMessage   },
          ],
        });

        totalInputTokens  += usage.promptTokens;
        totalOutputTokens += usage.completionTokens;

        const result = parseGapResponse(text);
        if (result.has_gap && result.confidence >= 0.65) {
          const existing = await findExistingAnswer(result.question, equipmentModel, documentId);
          const outcome  = await insertEnrichmentWithInheritance({
            documentId,
            referenceId:     image.id,
            referenceType:   'image',
            originalExcerpt: image.description.slice(0, 200),
            result,
            pageNumber:      image.page_number ?? null,
            existing,
          });
          if (outcome === 'inherited') {
            inherited++;
            if      (existing!.level === 1) exactCount++;
            else if (existing!.level === 2) metaCount++;
            else                            semCount++;
          } else if (!existing || existing.level !== 0) {
            newPending++;
          }
        }
      } catch (imageErr) {
        console.error(`[curious] Error en imagen ${image.id}:`, (imageErr as Error).message);
      }
    }

    const gapsFound = newPending + inherited;
    const summary =
      `${gapsFound} lagunas detectadas | ` +
      `${newPending} nuevas pendientes | ` +
      `${inherited} auto-respondidas (exact: ${exactCount}, meta: ${metaCount}, semantic: ${semCount})`;

    await logAgentEnd(
      logId,
      summary,
      { input: totalInputTokens, output: totalOutputTokens },
      { gapsFound, totalReviewed, chunks: chunks.length, images: images.length, inherited, newPending },
    );

    // ── Snapshot de Métricas Q1 ──
    await updateIndexingMetricsSnapshot(documentId);

  } catch (err) {
    await logAgentError(logId, err as Error);
    throw err;
  }
}

export async function runCuriousForSpecificImages(documentId: string, imageIds: string[]): Promise<number> {
  if (imageIds.length === 0) return 0;
  
  let newGaps = 0;
  try {
    const docResult = await client.execute({
      sql: `SELECT equipment_model FROM documents WHERE id = ? LIMIT 1`,
      args: [documentId],
    });
    const equipmentModel = (docResult.rows[0] as any)?.equipment_model ?? null;

    const placeholders = imageIds.map(() => '?').join(',');
    const imagesResult = await client.execute({
      sql: `SELECT id, description, image_type, image_url, page_number
            FROM extracted_images
            WHERE id IN (${placeholders}) AND document_id = ?`,
      args: [...imageIds, documentId],
    });

    const images = imagesResult.rows as unknown as Array<{
      id:          string;
      description: string | null;
      image_type:  string | null;
      image_url:   string | null;
      page_number: number | null;
    }>;

    for (const image of images) {
      if (!image.description) continue;
      
      const userMessage =
        `DESCRIPCIÓN DE IMAGEN TÉCNICA (Tipo: ${image.image_type ?? 'desconocido'}):\n` +
        image.description;

      const { text } = await generateText({
        model:     openai('gpt-4o-mini'),
        maxTokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage   },
        ],
      });

      const result = parseGapResponse(text);
      if (result.has_gap && result.confidence >= 0.65) {
        const existing = await findExistingAnswer(result.question, equipmentModel, documentId);
        const outcome = await insertEnrichmentWithInheritance({
          documentId,
          referenceId:     image.id,
          referenceType:   'image',
          originalExcerpt: image.description.slice(0, 200),
          result,
          pageNumber:      image.page_number ?? null,
          existing,
        });
        if (outcome !== 'inherited' && (!existing || existing.level !== 0)) {
          newGaps++;
        }
      }
    }
    
    // Al añadir nuevas imágenes o lagunas, actualizamos el snapshot
    await updateIndexingMetricsSnapshot(documentId);
    
  } catch (err) {
    console.error('[curious] Error ejecutando para imágenes manuales:', (err as Error).message);
  }
  return newGaps;
}

/**
 * Función centralizada para actualizar las métricas de un documento
 * Re-elabora la snapshot (UPSERT) agregando toda la información actual.
 */
export async function updateIndexingMetricsSnapshot(documentId: string): Promise<void> {
  try {
    // 1. Borramos la snapshot anterior para este documento
    await client.execute({
      sql: `DELETE FROM indexing_metrics WHERE document_id = ?`,
      args: [documentId],
    });

    // 2. Insertamos la snapshot fresca re-contando todo
    await client.execute({
      sql: `
        INSERT INTO indexing_metrics (
          id, document_id, total_chunks, hitl_images,
          agent_mismatch_count, detected_gaps, inherited_l1, inherited_l2, inherited_l3,
          total_input_tokens, total_output_tokens, processing_time_ms
        )
        SELECT 
          ?, d.id,
          (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id),
          (SELECT COUNT(*) FROM extracted_images WHERE document_id = d.id AND is_useful = 1),
          (SELECT COUNT(*) FROM extracted_images WHERE document_id = d.id AND description LIKE '%⚠ Nota del agente:%'),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id AND inheritance_level = 1),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id AND inheritance_level = 2),
          (SELECT COUNT(*) FROM enrichments WHERE document_id = d.id AND inheritance_level = 3),
          COALESCE((SELECT SUM(input_tokens) FROM agent_logs WHERE document_id = d.id), 0),
          COALESCE((SELECT SUM(output_tokens) FROM agent_logs WHERE document_id = d.id), 0),
          COALESCE(CAST((SELECT (julianday(MAX(ended_at)) - julianday(MIN(started_at))) * 86400000 FROM agent_logs WHERE document_id = d.id AND ended_at IS NOT NULL) AS INTEGER), 0)
        FROM documents d WHERE d.id = ?
      `,
      args: [createId(), documentId]
    });
    console.log(`[metrics] Snapshot de indexación actualizada para doc ${documentId}`);
  } catch (error) {
    console.error(`[metrics] Error actualizando snapshot metricas:`, (error as Error).message);
  }
}

