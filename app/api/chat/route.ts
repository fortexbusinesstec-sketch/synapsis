/**
 * POST /api/chat — "Comité de Diagnóstico" Multi-Agent v2
 *
 * FASE 0 — CLARIFICADOR    : gpt-4o-mini. Solo en primer mensaje corto sin contexto técnico.
 * FASE 1 — BIBLIOTECARIO   : Retrieval vectorial en Turso (chunks + imágenes)
 * FASE 2 — ANALISTA        : Internal monologue con gpt-4o-mini (no stream)
 * FASE 3 — INGENIERO JEFE  : Streaming response con gpt-4o
 * AGENTE 4 — VALIDADOR     : Filtrado puro de imágenes antes de enviar
 * AGENTE 5 — METRIFICADOR  : Persiste métricas en modo 'record'
 *
 * Headers de respuesta:
 *   x-retrieved-images   → JSON de imágenes validadas
 *   x-urgency-level      → baja | media | alta | critica
 *   x-analyst-reasoning  → razonamiento del analista
 *   x-session-id         → echo del sessionId recibido
 *   x-message-id         → ID de la fila chat_metrics (para rating)
 *   x-phase0-used        → '1' si se usó clarificación
 *   x-phase1-ms          → duración de retrieval
 *   x-phase2-ms          → duración del analista
 *   x-phase2-tokens      → tokens del analista
 *   x-chunks-retrieved   → fragmentos del manual usados
 *   x-images-retrieved   → imágenes antes del validador
 *   x-images-shown       → imágenes tras el validador
 *   x-enrichments-used   → '1' si se incluyeron notas de experto
 */

import { embed, generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createId } from '@paralleldrive/cuid2';
import type { Message } from 'ai';
import { client } from '@/lib/db';

import { runClarifier } from '@/lib/agents/clarifier';
import { saveChatMessage } from '@/lib/agents/metrifier';

export const maxDuration = 60;

/* ── Tipos ──────────────────────────────────────────────────────────────── */

interface ChunkWithEnrichmentRow {
  chunk_id: string;
  content: string;
  section_title: string | null;
  chunk_type: string | null;
  has_warning: number | null;
  page_number: number | null;
  doc_title: string | null;
  equipment_model: string | null;
  distance: number;
  enrichment_id: string | null;
  generated_question: string | null;
  expert_answer: string | null;
}

interface EnrichmentWithChunkRow {
  enrichment_id: string;
  generated_question: string | null;
  expert_answer: string | null;
  distance: number;
  chunk_id: string;
  chunk_content: string | null;
  section_title: string | null;
  chunk_type: string | null;
  has_warning: number | null;
  page_number: number | null;
  doc_title: string | null;
  equipment_model: string | null;
}

interface ConsolidatedEntry {
  content: string;
  section_title: string | null;
  chunk_type: string | null;
  has_warning: number | null;
  page_number: number | null;
  doc_title: string | null;
  equipment_model: string | null;
  enrichment_id: string | null;
  generated_question: string | null;
  expert_answer: string | null;
  distance: number;
}

interface RetrievedImage {
  description: string | null;
  image_url: string | null;
  image_type: string | null;
  is_critical: number | null;
  doc_title: string | null;
  distance: number;
}

interface AnalystOutput {
  urgency: 'baja' | 'media' | 'alta' | 'critica';
  insight_1: string;
  insight_2: string;
  verification_method: string;
  mentor_guidance: string;
}

interface AnalystResult {
  output: AnalystOutput;
  totalTokens: number;
}

interface BibliotecarioResult {
  groundTruth: string;
  retrievedImages: RetrievedImage[];
  chunksRetrieved: number;
  hasEnrichments: boolean;
  bestDistance: number;
}

/* ── Fallback del Analista ──────────────────────────────────────────────── */

const ANALYST_FALLBACK: AnalystOutput = {
  urgency: 'media',
  insight_1: 'Desgaste de componentes mecánicos o interferencia eléctrica.',
  insight_2: 'Posible degradación en sensores de posición o humedad en cuadro de control.',
  verification_method: 'Inspeccionar visualmente componentes mecánicos accesibles y verificar tensiones.',
  mentor_guidance: 'Inicia con calma y solicita al operario una verificación visual básica primero. No compliques el diagnóstico de entrada.',
};

/* ── FASE 1: Retrieval vectorial ─────────────────────────────────────────── */

async function runBibliotecario(
  queryVector: number[],
  equipmentModel: string | null,
  intent: string = 'troubleshooting'
): Promise<BibliotecarioResult> {
  const embeddingVec = new Uint8Array(new Float32Array(queryVector).buffer);
  const modelFilter = equipmentModel ? 'AND d.equipment_model = ?' : '';
  const orderClause = intent === 'education_info'
    ? "ORDER BY CASE WHEN dc.chunk_type IN ('theory', 'description', 'overview') THEN 0 ELSE 1 END, distance ASC"
    : "ORDER BY distance ASC";

  const queryA = `
    SELECT
      dc.id            AS chunk_id,
      dc.content,
      dc.section_title,
      dc.chunk_type,
      dc.has_warning,
      dc.page_number,
      d.title          AS doc_title,
      d.equipment_model,
      vector_distance_cos(dc.embedding, vector32(?)) AS distance,
      e.id             AS enrichment_id,
      e.generated_question,
      e.expert_answer
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    LEFT JOIN enrichments e
      ON  e.reference_id   = dc.id
      AND e.reference_type = 'chunk'
      AND e.is_verified    = 1
    WHERE d.status = 'ready'
      AND dc.embedding IS NOT NULL
      ${modelFilter}
    ${orderClause}
    LIMIT 5
  `;

  const queryB = `
    SELECT
      ei.description,
      ei.image_url,
      ei.image_type,
      ei.is_critical,
      d.title AS doc_title,
      vector_distance_cos(ei.embedding, vector32(?)) AS distance
    FROM extracted_images ei
    JOIN documents d ON ei.document_id = d.id
    WHERE d.status = 'ready'
      AND ei.embedding IS NOT NULL
      AND ei.image_type NOT IN ('decorative', 'cover', 'logo')
      ${modelFilter}
    ORDER BY distance ASC
    LIMIT 3
  `;

  const queryC = `
    SELECT
      e.id              AS enrichment_id,
      e.generated_question,
      e.expert_answer,
      vector_distance_cos(e.embedding, vector32(?)) AS distance,
      dc.id             AS chunk_id,
      dc.content        AS chunk_content,
      dc.section_title,
      dc.chunk_type,
      dc.has_warning,
      dc.page_number,
      d.title           AS doc_title,
      d.equipment_model
    FROM enrichments e
    JOIN documents d  ON d.id  = e.document_id
    INNER JOIN document_chunks dc ON dc.id = e.reference_id
    WHERE e.is_verified    = 1
      AND e.embedding      IS NOT NULL
      AND e.reference_type = 'chunk'
      AND d.status         = 'ready'
      ${modelFilter}
    ORDER BY distance ASC
    LIMIT 3
  `;

  const baseArgs = (vec: Uint8Array) =>
    equipmentModel ? [vec, equipmentModel] : [vec];

  const [resultA, resultB, resultC] = await Promise.all([
    client.execute({ sql: queryA, args: baseArgs(embeddingVec) }),
    client.execute({ sql: queryB, args: baseArgs(embeddingVec) }),
    client.execute({ sql: queryC, args: baseArgs(embeddingVec) })
      .catch(() => ({ rows: [] })),
  ]);

  const rowsA = resultA.rows as unknown as ChunkWithEnrichmentRow[];
  const images = resultB.rows as unknown as RetrievedImage[];
  const rowsC = resultC.rows as unknown as EnrichmentWithChunkRow[];

  const consolidatedMap = new Map<string, ConsolidatedEntry>();

  for (const row of rowsA) {
    consolidatedMap.set(row.chunk_id, {
      content: row.content,
      section_title: row.section_title,
      chunk_type: row.chunk_type,
      has_warning: row.has_warning,
      page_number: row.page_number,
      doc_title: row.doc_title,
      equipment_model: row.equipment_model,
      enrichment_id: row.enrichment_id ?? null,
      generated_question: row.generated_question ?? null,
      expert_answer: row.expert_answer ?? null,
      distance: row.distance,
    });
  }

  for (const row of rowsC) {
    const existing = consolidatedMap.get(row.chunk_id);
    if (existing) {
      if (!existing.enrichment_id && row.enrichment_id) {
        existing.enrichment_id = row.enrichment_id;
        existing.generated_question = row.generated_question;
        existing.expert_answer = row.expert_answer;
      }
      existing.distance = Math.min(existing.distance, row.distance);
    } else {
      consolidatedMap.set(row.chunk_id, {
        content: row.chunk_content ?? '',
        section_title: row.section_title,
        chunk_type: row.chunk_type,
        has_warning: row.has_warning,
        page_number: row.page_number,
        doc_title: row.doc_title,
        equipment_model: row.equipment_model,
        enrichment_id: row.enrichment_id,
        generated_question: row.generated_question,
        expert_answer: row.expert_answer,
        distance: row.distance,
      });
    }
  }

  const consolidated = [...consolidatedMap.values()].sort((a, b) => a.distance - b.distance);

  const chunkBlocks = consolidated.map(entry => {
    const source = [
      entry.doc_title ? `[${entry.doc_title}]` : '',
      entry.equipment_model ? `Modelo: ${entry.equipment_model}` : '',
      entry.page_number ? `Pág. ${entry.page_number}` : '',
      entry.section_title ? `§ ${entry.section_title}` : '',
    ].filter(Boolean).join(' · ');

    const warningPrefix = entry.has_warning ? '⚠️ ADVERTENCIA: ' : '';
    let block = `${source}\nMANUAL OFICIAL:\n${warningPrefix}${entry.content}`;
    if (entry.expert_answer) {
      block += `\n→ NOTA DEL EXPERTO: ${entry.expert_answer}`;
    }
    return block;
  });

  const imageBlock = images.length > 0
    ? '\n--- IMÁGENES TÉCNICAS RELACIONADAS ---\n' +
    images
      .filter(i => i.description)
      .map(i => `• [${i.image_type ?? 'imagen'}] ${i.doc_title ?? ''}: ${i.description}`)
      .join('\n')
    : '';

  const groundTruth = [...chunkBlocks, imageBlock]
    .filter(Boolean)
    .join('\n\n---\n\n');

  // Incrementar times_retrieved
  const usedEnrichmentIds = consolidated
    .map(e => e.enrichment_id)
    .filter((id): id is string => Boolean(id));

  if (usedEnrichmentIds.length > 0) {
    const placeholders = usedEnrichmentIds.map(() => '?').join(', ');
    client.execute({
      sql: `UPDATE enrichments SET times_retrieved = times_retrieved + 1 WHERE id IN (${placeholders})`,
      args: usedEnrichmentIds,
    }).catch(err => console.error('[chat] Error incrementando times_retrieved:', err.message));
  }

  const bestDistance = consolidated.length > 0 ? consolidated[0].distance : 1.0;

  return {
    groundTruth,
    retrievedImages: images,
    chunksRetrieved: consolidated.length,
    hasEnrichments: usedEnrichmentIds.length > 0,
    bestDistance,
  };
}

/* ── FASE 2: Internal Monologue (Analista) ──────────────────────────────── */

async function runAnalista(
  userQuery: string,
  groundTruth: string,
  intent: string,
): Promise<AnalystResult> {
  const { text, usage } = await generateText({
    model: openai('gpt-4o-mini'),
    maxTokens: 400,
    messages: [
      {
        role: 'system',
        content:
          "Eres el Agente 2 (Analista y Estratega Pedagógico) de Synapsis Go. Recibes el problema del usuario, el intent (intención) y los manuales recuperados. Tu trabajo es crear un monólogo interno estructurado en JSON para guiar al Agente 3 (Ingeniero Jefe).\n\n" +
          "REGLAS SEGÚN EL 'INTENT':\n\n" +
          "Si es troubleshooting: insight_1 e insight_2 deben ser hipótesis complejas de causa raíz (fallos en cascada, mecánica oculta). verification_method debe ser una prueba de campo (ej. medir voltaje).\n\n" +
          "Si es education_info: insight_1 e insight_2 deben ser analogías pedagógicas, principios de funcionamiento o errores comunes de concepto. verification_method debe ser una pregunta de reflexión para el usuario.\n\n" +
          "Si es emergency_protocol: insight_1 e insight_2 deben ser pasos estrictos de seguridad o estabilización. verification_method debe ser una confirmación de seguridad innegociable.\n\n" +
          "REGLA PARA 'MENTOR_GUIDANCE':\n" +
          "En el campo mentor_guidance, debes darle instrucciones directas al Agente 3 sobre CÓMO hablar. Define el tono emocional (calmado, autoritario, alentador), qué analogías usar, y recuérdale que no dé toda la información de golpe, sino que termine con una llamada a la acción o pregunta para mantener el diálogo abierto.\n\n" +
          'Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):\n' +
          '{"urgency":"baja"|"media"|"alta"|"critica",' +
          '"insight_1":"string","insight_2":"string","verification_method":"string","mentor_guidance":"string"}',
      },
      {
        role: 'user',
        content: `INTENT: ${intent}\nSÍNTOMA REPORTADO: ${userQuery}\n\nCONTEXTO DEL MANUAL:\n${groundTruth.slice(0, 3000)}`,
      },
    ],
  });

  const totalTokens = usage.totalTokens ?? (usage.promptTokens + usage.completionTokens);

  try {
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AnalystOutput>;
    if (
      !parsed.urgency ||
      !parsed.insight_1 ||
      !parsed.insight_2 ||
      !parsed.verification_method ||
      !parsed.mentor_guidance
    ) throw new Error('Estructura inválida');

    return { output: parsed as AnalystOutput, totalTokens };
  } catch (e) {
    console.error('[chat:fase2] Parse del Analista falló, usando fallback:', (e as Error).message);
    return { output: ANALYST_FALLBACK, totalTokens };
  }
}

/* ── HANDLER ─────────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  const timestamp = new Date().toISOString();

  let messages: Message[];
  let equipmentModel: string | null;
  let sessionId: string | null;
  let sessionMode: 'test' | 'record';
  let clarificationAnswers: Record<string, string> | null;

  let agentFlags = { planner: false, clarifier: true, analyst: true };

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    equipmentModel = body.equipmentModel || null;
    sessionId = body.sessionId || null;
    sessionMode = body.sessionMode === 'record' ? 'record' : 'test';
    clarificationAnswers = body.clarificationAnswers ?? null;
    if (body.agentFlags) agentFlags = body.agentFlags;

    console.log(`[${timestamp}][chat] Request received. Model: ${equipmentModel}, Planner: ${agentFlags.planner}`);
  } catch (err) {
    console.error(`[${timestamp}][chat] Error parsing body:`, (err as Error).message);
    return new Response(JSON.stringify({ error: 'Request body inválido.' }), { status: 400 });
  }

  const userQuery =
    typeof messages.at(-1)?.content === 'string'
      ? (messages.at(-1)!.content as string)
      : '';

  console.log(`[${timestamp}][chat] User Query: "${userQuery.slice(0, 50)}${userQuery.length > 50 ? '...' : ''}"`);

  if (!userQuery.trim()) {
    return new Response(JSON.stringify({ error: 'Sin consulta.' }), { status: 400 });
  }

  /* ────────────────────────────────────────────────────────────────────────
     FASE 0 — CLARIFICADOR (Expander/Router)
     Actúa de forma silenciosa para expandir la query de búsqueda.
  ──────────────────────────────────────────────────────────────────────── */
  let enrichedQuery = userQuery;
  let queryIntent = 'troubleshooting';

  if (agentFlags.clarifier) {
    try {
      const clarification = await runClarifier(userQuery, equipmentModel);
      queryIntent = clarification.intent;
    } catch (e) {
      console.error(`[${timestamp}][chat:fase0] Clarificador falló:`, (e as Error).message);
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
     FASE 1 — BIBLIOTECARIO: Retrieval vectorial
  ──────────────────────────────────────────────────────────────────────── */
  let groundTruth = '';
  let retrievedImages: RetrievedImage[] = [];
  let chunksRetrieved = 0;
  let hasEnrichments = false;

  const t1start = Date.now();

  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: enrichedQuery,
    });

    let bib = await runBibliotecario(embedding, equipmentModel, queryIntent);

    if (bib.chunksRetrieved === 0 || bib.bestDistance > 0.55) {
      console.log(`[chat:fase1] Fallback de rescate activado (Distancia: ${bib.bestDistance}). Buscando fundamentos...`);
      const fallbackQuery = `Diagnóstico general, teoría y principios básicos para: ${enrichedQuery}`;
      const { embedding: fallbackEmbedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: fallbackQuery,
      });
      const bibFallback = await runBibliotecario(fallbackEmbedding, equipmentModel, 'education_info');

      bib = bibFallback;
      bib.groundTruth = "NOTA DEL SISTEMA: No se encontró el código exacto o alta similitud para este síntoma. Se presenta información general y principios básicos para aplicar protocolo estándar:\\n\\n" + bib.groundTruth;
    }

    groundTruth = bib.groundTruth;
    retrievedImages = bib.retrievedImages;
    chunksRetrieved = bib.chunksRetrieved;
    hasEnrichments = bib.hasEnrichments;
  } catch (e) {
    console.error(`[${timestamp}][chat:fase1] Retrieval falló:`, (e as Error).message);

    const fallbackResult = streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: 'Eres un asistente técnico de ascensores. Responde brevemente.' },
        { role: 'user', content: 'No pude acceder a los manuales técnicos en este momento. Avisa al usuario que el sistema de búsqueda en manuales no está disponible y que puede reintentar en unos momentos.' },
      ],
    });
    return fallbackResult.toDataStreamResponse();
  }

  const t1end = Date.now();

  /* ────────────────────────────────────────────────────────────────────────
     AGENTE 4 — VALIDADOR DE IMÁGENES (filtro inline)
     Conserva solo imágenes con descripción real; descarta decorativas/logo.
  ──────────────────────────────────────────────────────────────────────── */
  const validatedImages = retrievedImages.filter(
    (img) => img.description && img.description.trim().length > 10,
  );

  /* ────────────────────────────────────────────────────────────────────────
     FASE 2 — ANALISTA: Internal monologue (nunca detiene la Fase 3)
  ──────────────────────────────────────────────────────────────────────── */
  let analista: AnalystOutput = ANALYST_FALLBACK;
  let phase2Tokens = 0;

  let t2start = Date.now();
  let t2end = Date.now();
  if (agentFlags.analyst) {
    t2start = Date.now();
    try {
      const analyzeResult = await runAnalista(enrichedQuery, groundTruth, queryIntent);
      analista = analyzeResult.output;
      phase2Tokens = analyzeResult.totalTokens;
    } catch (e) {
      console.error(`[${timestamp}][chat:fase2] Analista falló:`, (e as Error).message);
    }
    t2end = Date.now();
  }

  /* ────────────────────────────────────────────────────────────────────────
     FASE 3 — INGENIERO JEFE: Streaming response
  ──────────────────────────────────────────────────────────────────────── */
  // Variables de closure para capturar telemetría de Fase 3 desde onFinish
  let phase3MsCapture = 0;
  let phase3InputToksCapture = 0;
  let phase3OutputToksCapture = 0;

  try {
    // Ya no usamos hipótesis individuales
    const contextBlock = groundTruth.trim()
      ? `MANUAL TÉCNICO (Ground Truth):\n${groundTruth}`
      : 'MANUAL TÉCNICO: No se encontró documentación relacionada con este síntoma.';

    // Generar messageId antes del stream para incluirlo en los headers
    const messageId = createId();
    const t3start = Date.now();

    const result = streamText({
      model: openai('gpt-4o-mini'), // Switching to mini for testing and speed
      messages: [
        {
          role: 'system',
          content:
            "Eres el Ingeniero Jefe de Synapsis Go. Tu rol es ser un Mentor de Alto Nivel, un espejo brutalmente honesto y la máxima autoridad técnica. No eres un asistente complaciente.\n\n" +
            "REGLAS DE PERSONALIDAD Y TONO:\n\n" +
            "Cero Validación y Cero Adulación: No suavices la verdad. No saludes con entusiasmo. Ve directo al grano.\n\n" +
            "Desafío Intelectual: Cuestiona las suposiciones del técnico.\n\n" +
            "REGLAS DE FORMATO:\n" +
            "1. Ve directo al grano.\n" +
            "2. Máximo 4 pasos numerados.\n" +
            "3. Negritas solo en palabras clave.\n" +
            "4. Termina con una pregunta incisiva.",
        },
        {
          role: 'user',
          content:
            `SÍNTOMA: ${enrichedQuery}\n\n` +
            `${contextBlock}\n\n` +
            `IMÁGENES DISPONIBLES:\n${validatedImages.map(img => `URL: ${img.image_url} | Descripción: ${img.description}`).join('\n') || 'No hay imágenes disponibles para este caso.'}\n\n` +
            `ANÁLISIS DEL COMITÉ:\n` +
            `Nivel de urgencia: ${analista.urgency}\n` +
            `Consideración (Insight) 1: ${analista.insight_1}\n` +
            `Consideración (Insight) 2: ${analista.insight_2}\n` +
            `Método de Verificación: ${analista.verification_method}\n` +
            `INSTRUCCIONES DE DIRECCIÓN DE ESCENA (Mentor Guidance): ${analista.mentor_guidance}`,
        },
      ],

      // AGENTE 5 — METRIFICADOR: Persistir métricas al finalizar el stream
      onFinish: async ({ usage }) => {
        // Capturar telemetría de Fase 3 en variables de closure para los headers
        phase3MsCapture = Date.now() - t3start;
        phase3InputToksCapture = usage.promptTokens ?? 0;
        phase3OutputToksCapture = usage.completionTokens ?? 0;

        // En modo 'record': persistir el mensaje del asistente en chat_messages
        if (sessionId && sessionMode === 'record') {
          saveChatMessage(sessionId, 'assistant', '[stream completado]', 'record')
            .catch((err: Error) => console.error('[chat:metrifier] Error guardando mensaje:', err.message));
        }
      },
    });

    // Serializar imágenes validadas para el header
    const imagesForHeader = validatedImages.map((img) => ({
      url: img.image_url,
      description: img.description,
      image_type: img.image_type,
      is_critical: Boolean(img.is_critical),
    }));

    return result.toDataStreamResponse({
      headers: {
        'x-retrieved-images': encodeURIComponent(JSON.stringify(imagesForHeader)),
        'x-urgency-level': analista.urgency,
        'x-analyst-reasoning': encodeURIComponent(analista.mentor_guidance),
        'x-session-id': sessionId ?? '',
        'x-message-id': messageId,
        'x-phase0-used': agentFlags.clarifier ? '1' : '0',
        'x-phase2-used': agentFlags.analyst ? '1' : '0',
        'x-planner-used': agentFlags.planner ? '1' : '0',
        // Latencias por fase
        'x-phase1-ms': String(t1end - t1start),
        'x-phase2-ms': agentFlags.analyst ? String(t2end - t2start) : '0',
        'x-phase3-ms': String(phase3MsCapture),
        // Tokens por fase
        'x-phase2-tokens': String(phase2Tokens),
        'x-phase3-input-tokens': String(phase3InputToksCapture),
        'x-phase3-output-tokens': String(phase3OutputToksCapture),
        // Trazabilidad RAG
        'x-chunks-retrieved': String(chunksRetrieved),
        'x-images-retrieved': String(retrievedImages.length),
        'x-images-shown': String(validatedImages.length),
        'x-enrichments-used': String(hasEnrichments ? 1 : 0),
        // Telemetría de agentes
        'x-enriched-query': encodeURIComponent(enrichedQuery),
        'x-detected-intent': queryIntent,
      },
    });

  } catch (e) {
    console.error(`[${timestamp}][chat:fase3] Stream falló:`, (e as Error).message);
    return new Response(
      JSON.stringify({ error: 'Error al generar el diagnóstico. Intenta de nuevo.' }),
      { status: 500 },
    );
  }
}
