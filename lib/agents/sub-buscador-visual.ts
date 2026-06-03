import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { client } from '@/lib/db';

export interface RetrievedImage {
  image_id: string;
  image_url: string | null;
  description: string | null;
  image_type: string | null;
  is_critical: number;
  doc_title: string | null;
  doc_id: string;
  distance: number;
}

export interface BuscadorVisualResult {
  images: RetrievedImage[];
}

export async function runBuscadorVisual(
  query: string,
  documentIds: string[],
  equipmentModel: string | null,
): Promise<BuscadorVisualResult> {

  if (documentIds.length === 0) return { images: [] };

  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  });

  const vec = new Uint8Array(new Float32Array(embedding).buffer);
  const placeholders = documentIds.map(() => '?').join(', ');

  const sql = `
    SELECT
      ei.id AS image_id,
      ei.image_url,
      ei.description,
      ei.image_type,
      ei.is_critical,
      d.title AS doc_title,
      d.id AS doc_id,
      vector_distance_cos(ei.embedding, vector32(?)) AS distance
    FROM extracted_images ei
    JOIN documents d ON ei.document_id = d.id
    WHERE ei.document_id IN (${placeholders})
      AND ei.embedding IS NOT NULL
      AND ei.image_type NOT IN ('decorative', 'cover', 'logo')
      AND ei.description IS NOT NULL
      AND length(ei.description) > 15
    ORDER BY distance ASC
    LIMIT 6
  `;

  const result = await client.execute({ sql, args: [vec, ...documentIds] });

  const images = (result.rows as Record<string, unknown>[]).map(row => ({
    image_id: row.image_id as string,
    image_url: row.image_url as string | null,
    description: row.description as string | null,
    image_type: row.image_type as string | null,
    is_critical: (row.is_critical as number) ?? 0,
    doc_title: row.doc_title as string | null,
    doc_id: row.doc_id as string,
    distance: row.distance as number,
  }));

  return { images: images.slice(0, 4) };
}
