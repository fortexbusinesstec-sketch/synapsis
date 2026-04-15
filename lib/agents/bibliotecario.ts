/**
 * Agente 1 — Bibliotecario v2 (Unified Graph Search)
 *
 * Ejecuta 3 queries SQL en paralelo contra el grafo de conocimiento:
 *   Query A — document_chunks + LEFT JOIN enrichments
 *   Query B — enrichments standalone (Q&A validados por experto)
 *   Query C — extracted_images ancladas a los document_ids de Query A
 *
 * Score compuesto:
 *   final_score = 0.6 × similarity + 0.2 × has_warning + 0.2 × enrichment_match
 *
 * Devuelve top 10 ScoredChunk al Selector de Contexto.
 * Absorbe completamente al antiguo Validador de Imágenes.
 */
import { embed }    from 'ai';
import { openai }   from '@ai-sdk/openai';
import { client }   from '@/lib/db';
import type { SearchPlan } from './planner';
import type { GapDescriptor } from '@/lib/types/agents';

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export interface ScoredChunk {
  chunk_id:           string;
  content:            string;
  similarity:         number;         // 1 - vector_distance_cos
  has_warning:        number;         // 0 | 1
  enrichment_match:   number;         // 0 | 1
  source:             'manual' | 'enrichment' | 'image';
  final_score:        number;
  distance:           number;

  // Metadata para formateo
  document_id:        string;
  section_title:      string | null;
  chunk_type:         string | null;
  page_number:        number | null;
  doc_title:          string | null;
  equipment_model:    string | null;
  brand:              string | null;
  enrichment_id:      string | null;
  generated_question: string | null;
  expert_answer:      string | null;

  // Solo para imágenes (source = 'image')
  description:        string | null;
  image_type:         string | null;
}

export interface BibliotecarioFlags {
  enrichments: boolean;
  images:      boolean;
}

export interface BibliotecarioResult {
  chunks:           ScoredChunk[];
  redundantAvoided: number;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function computeScore(
  distance:         number,
  has_warning:      number,
  enrichment_match: number,
  entity_matches:   number = 0,
): { similarity: number; final_score: number } {
  const similarity  = 1 - distance;
  // REFACTOR: Reducimos bono de enrichment (0.2 -> 0.05)
  // Añadimos bono de entidad soft (0.05 por match, max 0.1)
  const entityBoost = Math.min(0.1, entity_matches * 0.05);
  const final_score = 0.6 * similarity + 0.2 * has_warning + 0.05 * enrichment_match + entityBoost;
  return { similarity, final_score };
}

/**
 * Penalización contextual de redundancia — gap-aware.
 * Un chunk NO se penaliza si es directamente relevante para el gap actual.
 * Penalidad: -0.25 (contextual vs -0.3 ciega anterior).
 * Si < 3 chunks válidos, fallback con -0.12.
 */
function applyRedundancyPenalty(
  chunks:           ScoredChunk[],
  previousChunkIds: string[],
  gap:              GapDescriptor | null,
): { chunks: ScoredChunk[]; redundantAvoided: number } {
  if (previousChunkIds.length === 0) return { chunks, redundantAvoided: 0 };

  const prevSet = new Set(previousChunkIds);

  function isGapRelevant(c: ScoredChunk): boolean {
    if (gap === null) return false;
    const lc = c.content.toLowerCase();
    return (
      lc.includes(gap.target.toLowerCase()) ||
      lc.includes(gap.search_hint.toLowerCase())
    );
  }

  const penalize = (penalty: number) => chunks.map(c => ({
    ...c,
    final_score: c.final_score - (
      prevSet.has(c.chunk_id) && !isGapRelevant(c) ? penalty : 0
    ),
  }));

  const withContextual = penalize(0.25);
  const validContextual = withContextual.filter(c => c.final_score >= 0);

  if (validContextual.length >= 3) {
    const redundantAvoided = withContextual.length - validContextual.length;
    return { chunks: validContextual, redundantAvoided };
  }

  // Fallback: penalidad suave
  const withSoft         = penalize(0.12);
  const validSoft        = withSoft.filter(c => c.final_score >= 0);
  const redundantAvoided = withSoft.filter(c => prevSet.has(c.chunk_id) && !isGapRelevant(c) && c.final_score < 0).length;

  return { chunks: validSoft, redundantAvoided };
}

/** Calcula cuántas entidades técnicas coinciden literalmente con el texto */
function countEntityMatches(content: string, entities: string[]): number {
  if (entities.length === 0) return 0;
  const lc = content.toLowerCase();
  let count = 0;
  // REFACTOR: También contamos números o mediciones técnicas (ej. Ω, 20, 450)
  const technical = entities.filter(e => e.length >= 1 && /[A-Z0-9Ω]/.test(e));
  for (const ent of technical.slice(0, 8)) {
    if (lc.includes(ent.toLowerCase())) count++;
  }
  return count;
}

/* ── Agente principal ─────────────────────────────────────────────────────── */

export async function runBibliotecario(
  plan:             SearchPlan,
  equipmentModel:   string | null,
  entities:         string[],
  flags:            BibliotecarioFlags,
  previousChunkIds: string[]          = [],
  gap:              GapDescriptor | null = null,
  historyContext:   string               = '',
): Promise<BibliotecarioResult> {
  // REFACTOR: Enriquecimiento dinámico de la query con el historial para evitar amnesia
  let enrichedTextQuery = plan.text_query;
  if (historyContext && historyContext.length > 20) {
    // Extraer modelo y códigos del historial si no están en la query
    // Simple regex heurística para encontrar patrones Schindler
    const models = historyContext.match(/\b(3300|5500|7000|700|EU)\b/gi) || [];
    const codes  = historyContext.match(/\b(E[0-9]{2,4}|[0-9]{4}|BatFlt)\b/gi) || [];
    const uniqueContext = [...new Set([...models, ...codes])].join(' ');
    
    // REFACTOR: Solo añadimos si NO están presentes, al FINAL para no romper 
    // la estructura semántica de la query principal que genera el Planificador.
    if (uniqueContext) {
      const missingParts = uniqueContext.split(' ').filter(part => !enrichedTextQuery.toLowerCase().includes(part.toLowerCase()));
      if (missingParts.length > 0) {
        enrichedTextQuery = `${enrichedTextQuery} ${missingParts.join(' ')}`.trim();
      }
    }

    // ── FILTRO ANTI-CONTAMINACIÓN (Enfoque Jerárquico) ─────────────────────
    // Si la query ya contiene un código fuerte, eliminamos ruido genérico
    const strongCodeMatch = enrichedTextQuery.match(/\b(E[0-9]{2,4}|CF[0-9]{2}|Ovrload|BatFlt|1514|LMG)\b/i);
    if (strongCodeMatch) {
      const genericNoise = [
        /\bno se mueve\b/gi, /\bse detiene\b/gi, /\bfalla de funcionamiento\b/gi,
        /\bno funciona\b/gi, /\bproblema con\b/gi, /\bascensor\b/gi,
      ];
      let sanitizedQuery = enrichedTextQuery;
      genericNoise.forEach(pattern => {
        sanitizedQuery = sanitizedQuery.replace(pattern, '').trim();
      });
      // Solo aplicamos si la query resultante no queda vacía y sigue teniendo el código
      if (sanitizedQuery.length > 5 && sanitizedQuery.toLowerCase().includes(strongCodeMatch[0].toLowerCase())) {
        enrichedTextQuery = sanitizedQuery.replace(/\s+/g, ' ');
      }
    }
  }

  // Generar embeddings en paralelo
  const [textEmbed, imgEmbed] = await Promise.all([
    embed({ model: openai.embedding('text-embedding-3-small'), value: enrichedTextQuery }),
    flags.images
      ? embed({ model: openai.embedding('text-embedding-3-small'), value: plan.image_query })
      : Promise.resolve({ embedding: [] as number[] }),
  ]);

  const textVec = new Uint8Array(new Float32Array(textEmbed.embedding).buffer);
  const modelFilter = equipmentModel
    ? 'AND (d.equipment_model = ? OR d.brand = \'Schindler General\')'
    : '';
  const modelArgs: string[] = equipmentModel ? [equipmentModel] : [];

  /* ── Query A: document_chunks + LEFT JOIN enrichments ─────────────────── */
  const queryA = `
    SELECT
      dc.id              AS chunk_id,
      dc.document_id,
      dc.content,
      dc.section_title,
      dc.chunk_type,
      dc.has_warning,
      dc.page_number,
      d.title            AS doc_title,
      d.equipment_model,
      d.brand,
      vector_distance_cos(dc.embedding, vector32(?)) AS distance,
      e.id               AS enrichment_id,
      e.generated_question,
      e.expert_answer
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    LEFT JOIN enrichments e
      ON e.reference_id   = dc.id
      AND e.reference_type = 'chunk'
      AND e.is_verified   = 1
      ${flags.enrichments ? '' : 'AND 0=1'}
    WHERE d.status = 'ready'
      AND dc.embedding IS NOT NULL
      ${modelFilter}
    ORDER BY distance ASC
    LIMIT 18
  `;
  const queryAArgs: (Uint8Array | string)[] = [textVec, ...modelArgs];

  /* ── Query B: enrichments standalone ─────────────────────────────────── */
  let queryBPromise: Promise<{ rows: unknown[] }> = Promise.resolve({ rows: [] });
  if (flags.enrichments) {
    const queryB = `
      SELECT
        e.id               AS enrichment_id,
        e.generated_question,
        e.expert_answer,
        vector_distance_cos(e.embedding, vector32(?)) AS distance,
        dc.id              AS chunk_id,
        dc.document_id,
        dc.content         AS chunk_content,
        dc.section_title,
        dc.chunk_type,
        dc.has_warning,
        dc.page_number,
        d.title            AS doc_title,
        d.equipment_model,
        d.brand
      FROM enrichments e
      JOIN documents d ON d.id = e.document_id
      INNER JOIN document_chunks dc ON dc.id = e.reference_id
      WHERE e.is_verified     = 1
        AND e.embedding       IS NOT NULL
        AND e.reference_type  = 'chunk'
        AND e.answer_source  != 'pending'
        AND d.status          = 'ready'
        ${equipmentModel ? 'AND (d.equipment_model = ? OR d.brand = \'Schindler General\')' : ''}
      ORDER BY distance ASC
      LIMIT 8
    `;
    const queryBArgs: (Uint8Array | string)[] = [textVec, ...modelArgs];
    queryBPromise = client.execute({ sql: queryB, args: queryBArgs });
  }

  /* ── Ejecutar A y B en paralelo ───────────────────────────────────────── */
  const [resultA, resultB] = await Promise.all([
    client.execute({ sql: queryA, args: queryAArgs }),
    queryBPromise,
  ]);

  /* ── Consolidar A + B por chunk_id ───────────────────────────────────── */
  const consolidated = new Map<string, ScoredChunk>();

  for (const row of resultA.rows as Record<string, unknown>[]) {
    const dist    = row.distance as number;
    const hw      = (row.has_warning as number) ?? 0;
    const em      = row.enrichment_id ? 1 : 0;
    const entCount = countEntityMatches((row.content as string) ?? '', entities);
    const { similarity, final_score } = computeScore(dist, hw, em, entCount);

    consolidated.set(row.chunk_id as string, {
      chunk_id:           row.chunk_id as string,
      content:            row.content  as string,
      similarity,
      has_warning:        hw,
      enrichment_match:   em,
      source:             'manual',
      final_score,
      distance:           dist,
      document_id:        row.document_id        as string,
      section_title:      row.section_title       as string | null,
      chunk_type:         row.chunk_type          as string | null,
      page_number:        row.page_number         as number | null,
      doc_title:          row.doc_title           as string | null,
      equipment_model:    row.equipment_model     as string | null,
      brand:              row.brand               as string | null,
      enrichment_id:      row.enrichment_id       as string | null,
      generated_question: row.generated_question  as string | null,
      expert_answer:      row.expert_answer       as string | null,
      description:        null,
      image_type:         null,
    });
  }

  // Query B: enriquece o agrega chunks de enrichments
  for (const row of resultB.rows as Record<string, unknown>[]) {
    const chunkId = row.chunk_id as string;
    const dist    = row.distance as number;
    const hw      = (row.has_warning as number) ?? 0;
    const existing = consolidated.get(chunkId);

    if (existing) {
      // Enriquecer con el enrichment si aún no tiene
      if (!existing.enrichment_id && row.enrichment_id) {
        existing.enrichment_id      = row.enrichment_id as string;
        existing.generated_question = row.generated_question as string | null;
        existing.expert_answer      = row.expert_answer as string | null;
        existing.enrichment_match   = 1;
        const entCount = countEntityMatches(existing.content, entities);
        const { final_score } = computeScore(existing.distance, existing.has_warning, 1, entCount);
        existing.final_score        = final_score;
      }
      existing.distance = Math.min(existing.distance, dist);
    } else {
      const entCount = countEntityMatches((row.chunk_content as string) ?? '', entities);
      const { similarity, final_score } = computeScore(dist, hw, 1, entCount);
      consolidated.set(chunkId, {
        chunk_id:           chunkId,
        content:            (row.chunk_content as string) ?? '',
        similarity,
        has_warning:        hw,
        enrichment_match:   1,
        source:             'enrichment',
        final_score,
        distance:           dist,
        document_id:        row.document_id        as string,
        section_title:      row.section_title       as string | null,
        chunk_type:         row.chunk_type          as string | null,
        page_number:        row.page_number         as number | null,
        doc_title:          row.doc_title           as string | null,
        equipment_model:    row.equipment_model     as string | null,
        brand:              row.brand               as string | null,
        enrichment_id:      row.enrichment_id       as string | null,
        generated_question: row.generated_question  as string | null,
        expert_answer:      row.expert_answer       as string | null,
        description:        null,
        image_type:         null,
      });
    }
  }

  // Ordenar por final_score DESC → tomar los top 8 de texto/enrichment
  const textChunks = [...consolidated.values()]
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 8);

  // Incrementar times_retrieved en enrichments usados
  const usedEnrichmentIds = textChunks
    .map(c => c.enrichment_id)
    .filter((id): id is string => Boolean(id));
  if (usedEnrichmentIds.length > 0) {
    const ph = usedEnrichmentIds.map(() => '?').join(', ');
    client.execute({
      sql:  `UPDATE enrichments SET times_retrieved = times_retrieved + 1 WHERE id IN (${ph})`,
      args: usedEnrichmentIds,
    }).catch(err => console.error('[bibliotecario] times_retrieved error:', (err as Error).message));
  }

  /* ── Query C: extracted_images ancladas a document_ids de A ──────────── */
  let imageChunks: ScoredChunk[] = [];
  if (flags.images && imgEmbed.embedding.length > 0 && textChunks.length > 0) {
    const docIds    = [...new Set(textChunks.map(c => c.document_id))];
    const imgVec    = new Uint8Array(new Float32Array(imgEmbed.embedding).buffer);
    const docPlaces = docIds.map(() => '?').join(', ');

    try {
      const resultC = await client.execute({
        sql: `
          SELECT
            ei.id          AS chunk_id,
            ei.document_id,
            ei.description,
            ei.image_type,
            ei.page_number,
            ei.is_critical AS has_warning,
            d.title        AS doc_title,
            d.equipment_model,
            d.brand,
            e.id           AS enrichment_id,
            e.generated_question,
            e.expert_answer,
            vector_distance_cos(ei.embedding, vector32(?)) AS distance
          FROM extracted_images ei
          JOIN documents d ON ei.document_id = d.id
          LEFT JOIN enrichments e
            ON e.reference_id   = ei.id
            AND e.reference_type = 'image'
            AND e.is_verified   = 1
          WHERE ei.document_id IN (${docPlaces})
            AND ei.embedding   IS NOT NULL
            AND ei.image_type NOT IN ('decorative', 'cover', 'logo')
          ORDER BY distance ASC
          LIMIT 8
        `,
        // REFACTOR: Fallback de documentos — si hay pocos documentos recuperados, 
        // incluimos todos los documentos del modelo del equipo si es posible
        args: [imgVec, ...docIds],
      });

      for (const row of resultC.rows as Record<string, unknown>[]) {
        const dist = row.distance as number;
        const hw   = ((row.has_warning as number) ?? 0) > 0 ? 1 : 0;
        const em   = row.enrichment_id ? 1 : 0;
        const { similarity, final_score } = computeScore(dist, hw, em);

        imageChunks.push({
          chunk_id:           row.chunk_id as string,
          content:            (row.description as string) ?? '',
          similarity,
          has_warning:        hw,
          enrichment_match:   em,
          source:             'image',
          final_score,
          distance:           dist,
          document_id:        row.document_id       as string,
          section_title:      null,
          chunk_type:         'image',
          page_number:        row.page_number        as number | null,
          doc_title:          row.doc_title          as string | null,
          equipment_model:    row.equipment_model    as string | null,
          brand:              row.brand              as string | null,
          enrichment_id:      row.enrichment_id      as string | null,
          generated_question: row.generated_question as string | null,
          expert_answer:      row.expert_answer      as string | null,
          description:        row.description        as string | null,
          image_type:         row.image_type         as string | null,
        });
      }
    } catch (err) {
      console.error('[bibliotecario] Query C error:', (err as Error).message);
    }
  }

  /* ── Fusionar, penalizar redundancia y devolver top 10 ───────────────── */
  const merged = [...textChunks, ...imageChunks]
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 10);

  const { chunks: all, redundantAvoided } = applyRedundancyPenalty(merged, previousChunkIds, gap);

  // Re-ordenar tras penalización
  all.sort((a, b) => b.final_score - a.final_score);

  // Fallback: si ningún chunk tiene similarity > 0.45 (distance > 0.55)
  const bestSimilarity = all.length > 0 ? all[0].similarity : 0;
  if (bestSimilarity < 0.45 && all.length > 0) {
    console.log(`[bibliotecario] Baja similitud (${bestSimilarity.toFixed(3)}) — marcando para fallback`);
    // No ejecutamos fallback aquí; lo hace route.ts si es loopIndex=0
  }

  if (redundantAvoided > 0) {
    console.log(`[bibliotecario] Penalización redundancia: ${redundantAvoided} chunks descartados`);
  }

  return { chunks: all, redundantAvoided };
}
