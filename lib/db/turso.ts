import { eq } from 'drizzle-orm';
import { db } from './index';
import { documents } from './schema';

export type PipelineStatus =
  | 'pending'
  | 'analyzing'
  | 'ocr'
  | 'scanning_vectors'
  | 'processing'
  | 'embedding'
  | 'ready'
  | 'error';

export async function updateDocumentStatus(
  id: string,
  status: PipelineStatus,
  detail?: string,
  extra?: { pageCount?: number; language?: string },
) {
  await db
    .update(documents)
    .set({
      status,
      statusDetail: detail ?? null,
      ...(extra?.pageCount !== undefined ? { pageCount: extra.pageCount } : {}),
      ...(extra?.language !== undefined ? { language: extra.language } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(documents.id, id));
}

export async function getDocumentById(id: string) {
  const rows = await db
    .select({
      id:           documents.id,
      title:        documents.title,
      status:       documents.status,
      statusDetail: documents.statusDetail,
      pageCount:    documents.pageCount,
      docType:      documents.docType,
      createdAt:    documents.createdAt,
      costOrchestrator: documents.costOrchestrator,
      costOcr:          documents.costOcr,
      costVision:       documents.costVision,
      costChunker:      documents.costChunker,
      costEmbedder:     documents.costEmbedder,
      totalCost:        documents.totalCost,
      auditorRecommendations: documents.auditorRecommendations,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  return rows[0] ?? null;
}
