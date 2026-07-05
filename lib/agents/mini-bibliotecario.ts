/**
 * MiniBibliotecario — Agente de recuperación ligero para evaluación de base de conocimiento.
 *
 * Sin ReAct Loop, sin penalización por redundancia, sin gap awareness.
 * Solo recupera, scora y rankea top-k fragmentos de 3 fuentes paralelas.
 */
import { embed }    from 'ai';
import { openai }   from '@ai-sdk/openai';
import { client }   from '@/lib/db';

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export interface MiniChunk {
  rank:            number;
  source:          'document_chunk' | 'enrichment' | 'image';
  id:              string;
  text:            string;
  score:           number;
  warning_flag:    boolean;
  enrichment_match: boolean;
  similarity:      number;
  document_id:     string;
}

export interface MiniBibliotecarioInput {
  query_text: string;
  top_k?:    number;
}

export interface MiniBibliotecarioOutput {
  chunks: MiniChunk[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function computeScore(
  distance:         number,
  has_warning:      number,
  enrichment_match: number,
  entity_matches:   number = 0,
): { similarity: number; final_score: number } {
  const similarity  = 1 - distance;
  const entityBoost = Math.min(0.1, entity_matches * 0.05);
  const final_score = 0.6 * similarity + 0.2 * has_warning + 0.05 * enrichment_match + entityBoost;
  return { similarity, final_score };
}

function extractTechnicalEntities(text: string): string[] {
  const entities: string[] = [];
  const patterns = [
    /\b(E[0-9]{2,4}|CF[0-9]{2}|BM[0-9]{3}|SB\s*Fault)\b/gi,
    /\b(BatFlt|Ovrload|LMSnRdy|PEBOFlt|AccTBlk|RdvBVR)\b/gi,
    /\b(SCIC|SDIC|SMIC|LDU|HMI|SMLCD)\b/gi,
    /\b(KTC|KTS|KNE|KSS|KSKB|KTHM|KBA|KB)\b/gi,
    /\b(MGB|LMG|PHS|RPHT|LUET|PEBO|TDIF|LOP|COP)\b/gi,
    /\b(ACVF|DC\s*Link|CAN|LON)\b/gi,
    /\b(3300|5500|7000)\b/gi,
    /\b(\d{4})\b/g,
    /\b(\d+[°]\s*C)\b/gi,
    /\b(\d{2,3}\s*[VvAaΩΩ])\b/g,
  ];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) entities.push(...matches);
  }
  return [...new Set(entities.map(e => e.trim()))];
}

function countEntityMatches(content: string, entities: string[]): number {
  if (entities.length === 0) return 0;
  const lc = content.toLowerCase();
  let count = 0;
  for (const ent of entities.slice(0, 8)) {
    if (lc.includes(ent.toLowerCase())) count++;
  }
  return count;
}

/* ── Agente principal ─────────────────────────────────────────────────────── */

export async function runMiniBibliotecario(
  input: MiniBibliotecarioInput,
): Promise<MiniBibliotecarioOutput> {
  const topK = input.top_k ?? 10;

  const queryEmbedding = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: input.query_text,
  });

  const queryVec = new Uint8Array(new Float32Array(queryEmbedding.embedding).buffer);

  const entities = extractTechnicalEntities(input.query_text);

  /* ── Query A: document_chunks (top 18) ────────────────────────────────── */
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
      vector_distance_cos(dc.embedding, vector32(?)) AS distance
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.status = 'ready'
      AND dc.embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT 18
  `;

  /* ── Query B: enrichments standalone (top 8) ──────────────────────────── */
  const queryB = `
    SELECT
      e.id               AS enrichment_id,
      e.generated_question,
      e.expert_answer,
      e.reference_id     AS chunk_id,
      e.document_id,
      dc.content         AS chunk_content,
      dc.has_warning,
      d.title            AS doc_title,
      d.equipment_model,
      vector_distance_cos(e.embedding, vector32(?)) AS distance
    FROM enrichments e
    JOIN documents d ON d.id = e.document_id
    INNER JOIN document_chunks dc ON dc.id = e.reference_id
    WHERE e.is_verified     = 1
      AND e.embedding       IS NOT NULL
      AND e.reference_type  = 'chunk'
      AND e.answer_source  != 'pending'
      AND d.status          = 'ready'
    ORDER BY distance ASC
    LIMIT 8
  `;

  /* ── Query C: extracted_images (top 8) ────────────────────────────────── */
  const queryC = `
    SELECT
      ei.id              AS image_id,
      ei.document_id,
      ei.description,
      ei.image_type,
      ei.page_number,
      ei.is_critical     AS has_warning,
      d.title            AS doc_title,
      d.equipment_model,
      vector_distance_cos(ei.embedding, vector32(?)) AS distance
    FROM extracted_images ei
    JOIN documents d ON ei.document_id = d.id
    WHERE ei.embedding IS NOT NULL
      AND ei.image_type NOT IN ('decorative', 'cover', 'logo')
      AND ei.is_discarded = 0
    ORDER BY distance ASC
    LIMIT 8
  `;

  const argsA: (Uint8Array | string)[] = [queryVec];
  const argsB: (Uint8Array | string)[] = [queryVec];
  const argsC: (Uint8Array | string)[] = [queryVec];

  const [resultA, resultB, resultC] = await Promise.all([
    client.execute({ sql: queryA, args: argsA }),
    client.execute({ sql: queryB, args: argsB }),
    client.execute({ sql: queryC, args: argsC }),
  ]);

  const allChunks: MiniChunk[] = [];

  /* ── Procesar Query A: document_chunks ────────────────────────────────── */
  for (const row of resultA.rows as Record<string, unknown>[]) {
    const dist = row.distance as number;
    const hw   = (row.has_warning as number) ?? 0;
    const content = (row.content as string) ?? '';
    const entCount = countEntityMatches(content, entities);
    const { similarity, final_score } = computeScore(dist, hw, 0, entCount);

    allChunks.push({
      rank: 0,
      source: 'document_chunk',
      id: row.chunk_id as string,
      text: content,
      score: final_score,
      warning_flag: hw === 1,
      enrichment_match: false,
      similarity,
      document_id: row.document_id as string,
    });
  }

  /* ── Procesar Query B: enrichments standalone ─────────────────────────── */
  for (const row of resultB.rows as Record<string, unknown>[]) {
    const dist = row.distance as number;
    const hw   = (row.has_warning as number) ?? 0;
    const content = (row.chunk_content as string) ?? '';
    const enrichmentText = `${(row.generated_question as string) ?? ''} ${(row.expert_answer as string) ?? ''}`;
    const textForScoring = content || enrichmentText;
    const entCount = countEntityMatches(textForScoring, entities);
    const { similarity, final_score } = computeScore(dist, hw, 1, entCount);

    allChunks.push({
      rank: 0,
      source: 'enrichment',
      id: row.enrichment_id as string,
      text: enrichmentText,
      score: final_score,
      warning_flag: hw === 1,
      enrichment_match: true,
      similarity,
      document_id: row.document_id as string,
    });
  }

  /* ── Procesar Query C: extracted_images ───────────────────────────────── */
  for (const row of resultC.rows as Record<string, unknown>[]) {
    const dist = row.distance as number;
    const hw   = ((row.has_warning as number) ?? 0) > 0 ? 1 : 0;
    const description = (row.description as string) ?? '';
    if (!description) continue;
    const entCount = countEntityMatches(description, entities);
    const { similarity, final_score } = computeScore(dist, hw, 0, entCount);

    allChunks.push({
      rank: 0,
      source: 'image',
      id: row.image_id as string,
      text: description,
      score: final_score,
      warning_flag: hw === 1,
      enrichment_match: false,
      similarity,
      document_id: row.document_id as string,
    });
  }

  /* ── Ordenar y tomar top-k ────────────────────────────────────────────── */
  allChunks.sort((a, b) => b.score - a.score);

  const top = allChunks.slice(0, topK).map((chunk, i) => ({
    ...chunk,
    rank: i + 1,
  }));

  return { chunks: top };
}
