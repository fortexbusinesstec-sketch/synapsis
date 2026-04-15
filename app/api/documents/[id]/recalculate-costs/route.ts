/**
 * POST /api/documents/[id]/recalculate-costs
 *
 * Recalcula los costos FinOps para un documento basándose en
 * métricas reales de la BD (no requiere tokens exactos):
 *
 *  OCR:    pageCount × $0.001  (Mistral OCR — tarifa por página)
 *  Vision: hitlImages × $0.0002 (GPT-4o / Pixtral — promedio por imagen HITL)
 *
 * Los costos del pipeline automático (orchestrator, chunker, embedder, curious)
 * se preservan tal cual están en la BD.
 */
import { NextResponse } from 'next/server';
import { eq, count, and, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, extractedImages } from '@/lib/db/schema';
import { RATES } from '@/lib/utils/costs';

const VISION_COST_PER_IMAGE = 0.0002; // ~1,200 tokens promedio × $0.15/1M input + output

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  // 1. Fetch documento actual
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
  }

  // 2. Contar imágenes HITL activas (no descartadas)
  const [imagesResult] = await db
    .select({ count: count() })
    .from(extractedImages)
    .where(
      and(
        eq(extractedImages.documentId, documentId),
        eq(extractedImages.isDiscarded, 0),
      )
    );

  const hitlImageCount = imagesResult?.count ?? 0;

  // 3. Calcular costos
  const newCostOcr    = (doc.pageCount ?? 0) * RATES.ocr.perPage;         // $0.001/pág
  const newCostVision = hitlImageCount * VISION_COST_PER_IMAGE;           // $0.0002/img

  // Preservar costos del pipeline automático
  const costOrchestrator = doc.costOrchestrator ?? 0;
  const costChunker      = doc.costChunker      ?? 0;
  const costEmbedder     = doc.costEmbedder     ?? 0;

  const newTotalCost =
    costOrchestrator +
    newCostOcr       +
    newCostVision    +
    costChunker      +
    costEmbedder;

  // 4. Actualizar en BD
  await db
    .update(documents)
    .set({
      costOcr:    newCostOcr,
      costVision: newCostVision,
      totalCost:  newTotalCost,
    })
    .where(eq(documents.id, documentId));

  return NextResponse.json({
    success:        true,
    documentId,
    recalculated: {
      pageCount:      doc.pageCount    ?? 0,
      hitlImages:     hitlImageCount,
      costOcr:        newCostOcr,
      costVision:     newCostVision,
      costOrchestrator,
      costChunker,
      costEmbedder,
      totalCost:      newTotalCost,
    },
  });
}
