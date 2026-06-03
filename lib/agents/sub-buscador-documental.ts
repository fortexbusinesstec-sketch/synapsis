import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { client } from '@/lib/db';

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  section_title: string | null;
  chunk_type: string | null;
  has_warning: number;
  page_number: number | null;
  doc_title: string | null;
  equipment_model: string | null;
  distance: number;
  enrichment_id: string | null;
  expert_answer: string | null;
}

export interface BuscadorDocumentalResult {
  chunks: DocumentChunk[];
  bestDistance: number;
  hasEnrichments: boolean;
}

export async function runBuscadorDocumental(
  query: string,
  equipmentModel: string | null,
  intent: 'troubleshooting' | 'education_info',
  entities: string[],
): Promise<BuscadorDocumentalResult> {

  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  });

  const vec = new Uint8Array(new Float32Array(embedding).buffer);
  const modelFilter = equipmentModel ? 'AND (d.equipment_model = ? OR d.brand = \'Schindler General\')' : '';
  const modelArgs = equipmentModel ? [equipmentModel] : [];

  const orderClause = intent === 'education_info'
    ? "ORDER BY CASE WHEN dc.chunk_type IN ('theory', 'description', 'overview') THEN 0 ELSE 1 END, distance ASC"
    : "ORDER BY distance ASC";

  const queryA = `
    SELECT
      dc.id AS chunk_id,
      d.id AS document_id,
      dc.content,
      dc.section_title,
      dc.chunk_type,
      dc.has_warning,
      dc.page_number,
      d.title AS doc_title,
      d.equipment_model,
      vector_distance_cos(dc.embedding, vector32(?)) AS distance,
      e.id AS enrichment_id,
      e.expert_answer
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    LEFT JOIN enrichments e ON e.reference_id = dc.id AND e.reference_type = 'chunk' AND e.is_verified = 1
    WHERE d.status = 'ready' AND dc.embedding IS NOT NULL
      ${modelFilter}
    ${orderClause}
    LIMIT 12
  `;

  const resultA = await client.execute({ sql: queryA, args: [vec, ...modelArgs] });

  const chunks = (resultA.rows as Record<string, unknown>[]).map(row => ({
    chunk_id: row.chunk_id as string,
    document_id: row.document_id as string,
    content: row.content as string,
    section_title: row.section_title as string | null,
    chunk_type: row.chunk_type as string | null,
    has_warning: (row.has_warning as number) ?? 0,
    page_number: row.page_number as number | null,
    doc_title: row.doc_title as string | null,
    equipment_model: row.equipment_model as string | null,
    distance: row.distance as number,
    enrichment_id: row.enrichment_id as string | null,
    expert_answer: row.expert_answer as string | null,
  }));

  const queryB = `
    SELECT
      e.id AS enrichment_id,
      e.expert_answer,
      vector_distance_cos(e.embedding, vector32(?)) AS distance,
      dc.id AS chunk_id,
      d.id AS document_id,
      dc.content,
      dc.section_title,
      dc.chunk_type,
      dc.has_warning,
      dc.page_number,
      d.title AS doc_title,
      d.equipment_model
    FROM enrichments e
    JOIN documents d ON d.id = e.document_id
    INNER JOIN document_chunks dc ON dc.id = e.reference_id
    WHERE e.is_verified = 1 AND e.embedding IS NOT NULL
      AND e.reference_type = 'chunk' AND e.answer_source != 'pending'
      AND d.status = 'ready'
      ${equipmentModel ? 'AND (d.equipment_model = ? OR d.brand = \'Schindler General\')' : ''}
    ORDER BY distance ASC
    LIMIT 6
  `;

  const resultB = await client.execute({ sql: queryB, args: [vec, ...modelArgs] });

  const chunkMap = new Map(chunks.map(c => [c.chunk_id, c]));

  for (const row of resultB.rows as Record<string, unknown>[]) {
    const cid = row.chunk_id as string;
    const existing = chunkMap.get(cid);
    if (existing) {
      if (!existing.enrichment_id && row.enrichment_id) {
        existing.enrichment_id = row.enrichment_id as string;
        existing.expert_answer = row.expert_answer as string;
      }
      existing.distance = Math.min(existing.distance, row.distance as number);
    } else {
      chunkMap.set(cid, {
        chunk_id: cid,
        document_id: row.document_id as string,
        content: row.content as string,
        section_title: row.section_title as string | null,
        chunk_type: row.chunk_type as string | null,
        has_warning: (row.has_warning as number) ?? 0,
        page_number: row.page_number as number | null,
        doc_title: row.doc_title as string | null,
        equipment_model: row.equipment_model as string | null,
        distance: row.distance as number,
        enrichment_id: row.enrichment_id as string | null,
        expert_answer: row.expert_answer as string | null,
      });
    }
  }

  const allChunks = Array.from(chunkMap.values()).sort((a, b) => a.distance - b.distance);

  return {
    chunks: allChunks.slice(0, 8),
    bestDistance: allChunks[0]?.distance ?? 1.0,
    hasEnrichments: allChunks.some(c => c.enrichment_id),
  };
}
