/**
 * POST /api/upload
 *
 * Patrón Non-blocking Background Execution:
 * 1. Sube el PDF a Vercel Blob.
 * 2. Inserta el documento en Turso con status='pending'.
 * 3. Retorna { documentId, status: 'pending' } al cliente INMEDIATAMENTE.
 * 4. `waitUntil` mantiene la función viva en Vercel mientras corre el pipeline.
 *
 * Pipeline (processDocumentPipeline):
 *   Orchestrator → OCR → Promise.all([chunks, images]) → Embedder → ready
 */
import { waitUntil } from '@vercel/functions';
import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

import { db } from '@/lib/db';
import { documents, documentChunks, extractedImages } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/db/auth';
import { updateDocumentStatus } from '@/lib/db/turso';
import { uploadPdf, uploadImage } from '@/lib/storage/blob';
import { calculateAgentCost, RATES } from '@/lib/utils/costs';

import { runOrchestrator } from '@/lib/agents/orchestrator';
import { runOcr } from '@/lib/agents/ocr';
import type { OcrPage } from '@/lib/agents/ocr';
import { processImage as visionRoute, type ImageInput, type ImageResult } from '@/lib/agents/vision';
import { runVectorScanner } from '@/lib/agents/vector-scanner';
import { runDiagramReasoner, isDiagramEligible, serializeDiagramKnowledge } from '@/lib/agents/diagram-reasoner';
import { chunkAllPages } from '@/lib/agents/chunker';
import { embedAll } from '@/lib/agents/embedder';
import { logAgentStart, logAgentEnd, logAgentError } from '@/lib/agents/logger';
import { runCuriousAgent, updateIndexingMetricsSnapshot } from '@/lib/agents/curious';

/* ── Vercel: permitir hasta 5 minutos (función de larga duración) ──────── */
export const maxDuration = 300;

/* ═══════════════════════════════════════════════════════════════════════
   CAMINO A — Texto: chunking semántico
═══════════════════════════════════════════════════════════════════════ */

interface PreparedChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  sectionTitle: string | null;
  chunkType: string;
  hasWarning: boolean;
  tokenEstimate: number;
}

async function prepareTextChunks(
  documentId: string,
  pages: OcrPage[],
): Promise<{ data: PreparedChunk[]; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const logId = await logAgentStart(
    documentId,
    'chunker',
    `${pages.length} páginas a fragmentar`,
  );

  try {
    const { data: chunks, usage } = await chunkAllPages(pages);
    const result: PreparedChunk[] = chunks.map((c) => ({
      content: c.content,
      pageNumber: c.page_number,
      chunkIndex: c.chunk_index,
      sectionTitle: c.section_title,
      chunkType: c.chunk_type,
      hasWarning: c.has_warning,
      tokenEstimate: c.token_estimate,
    }));

    const warnings = result.filter((c) => c.hasWarning).length;
    await logAgentEnd(
      logId,
      `${result.length} chunks generados (${warnings} con advertencias)`,
      { input: usage.prompt_tokens, output: usage.completion_tokens },
      { chunks: result.length, warnings },
    );

    return { data: result, usage };
  } catch (err) {
    await logAgentError(logId, err as Error);
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   CAMINO B — Imágenes: visión + subida a Blob
═══════════════════════════════════════════════════════════════════════ */

interface PreparedImage {
  imageUrl: string;
  pageNumber: number;
  imageType: string;
  confidence: number;
  description: string;
  isCritical: boolean;
  metadata?: string;    // JSON — presente solo en imágenes del VectorScanner
}

/* 
   PREPARE IMAGES HAS BEEN DECOMMISSIONED 
   All image processing is now 100% HITL via scan-recommendations API.
*/

/* ── Inyección de conocimiento de diagramas en el markdown de las páginas ── */

function enrichPagesWithDiagramKnowledge(
  pages: OcrPage[],
  diagramKnowledge: Map<number, string[]>,
): OcrPage[] {
  if (diagramKnowledge.size === 0) return pages;

  return pages.map((page) => {
    const blocks = diagramKnowledge.get(page.index + 1);
    if (!blocks || blocks.length === 0) return page;
    return {
      ...page,
      markdown: page.markdown + blocks.join('\n'),
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   PIPELINE PRINCIPAL (background)
═══════════════════════════════════════════════════════════════════════ */

async function processDocumentPipeline(
  documentId: string,
  pdfUrl: string,
  title: string,
  docType: string,
): Promise<void> {

  try {
    /* ── 1. OCR (para Preview y Orchestrator) ── */
    await updateDocumentStatus(documentId, 'ocr', 'Extrayendo texto con OCR…');
    const ocrLogId = await logAgentStart(documentId, 'ocr', `Procesando ${pdfUrl}`);

    const { data: ocr, usage: ocrUsage } = await runOcr(pdfUrl);
    const costOcr = calculateAgentCost('ocr', ocrUsage);

    await db.update(documents)
      .set({
        costOcr,
        totalCost: sql`${documents.totalCost} + ${costOcr}`,
        pageCount: ocr.pageCount
      })
      .where(eq(documents.id, documentId));

    // Estadísticas del OCR para el log (antes del VectorScanner)
    const rasterImagesFound = ocr.pages.reduce((s, p) => s + p.images.length, 0);
    const pagesWithoutImages = ocr.pages.filter(p => p.images.length === 0).length;

    await logAgentEnd(
      ocrLogId,
      `${ocr.pageCount} páginas | ${rasterImagesFound} imágenes raster encontradas | ${pagesWithoutImages} páginas sin imágenes con contenido técnico → pasadas al VectorScanner`,
      { input: 0, output: 0 },
      { pages: ocr.pageCount, rasterImages: rasterImagesFound, candidatePages: pagesWithoutImages },
    );

    /* ── 2. Orchestrator ── */
    await updateDocumentStatus(documentId, 'analyzing', 'Analizando estructura…');
    const orchLogId = await logAgentStart(documentId, 'orchestrator', `Análisis de ${title}`);

    const previewPages = ocr.pages.slice(0, 2).map((p) => p.markdown);
    const { data: orch, usage: orchUsage } = await runOrchestrator(title, docType, previewPages);
    const costOrch = calculateAgentCost('orchestrator', orchUsage);

    await db.update(documents)
      .set({ costOrchestrator: costOrch, totalCost: sql`${documents.totalCost} + ${costOrch}` })
      .where(eq(documents.id, documentId));

    await logAgentEnd(orchLogId, `Estrategia: ${orch.strategy}`, { input: orchUsage.prompt_tokens, output: orchUsage.completion_tokens });

    /* ── 4a. Chunker (Solo Texto) ── */
    await updateDocumentStatus(documentId, 'processing', 'Chunking semántico de texto…');

    const chunkResult = await prepareTextChunks(documentId, ocr.pages);
    const costChunker = calculateAgentCost('chunker', chunkResult.usage);

    await db.update(documents)
      .set({
        costChunker,
        totalCost: sql`${documents.totalCost} + ${costChunker}`,
      })
      .where(eq(documents.id, documentId));


    /* ── 5. Embedder ── */
    await updateDocumentStatus(documentId, 'embedding', 'Vectorizando…');
    const embedLogId = await logAgentStart(documentId, 'embedder', 'Generando vectores');

    const totalTexts = chunkResult.data.map(c => c.content).filter(t => t && t.trim().length > 0);

    if (totalTexts.length === 0) {
      console.warn(`[pipeline] No hay textos para vectorizar en ${documentId}`);
    }

    const { data: embeddings, usage: embedUsage } = await embedAll(totalTexts);
    const costEmbedder = calculateAgentCost('embedder', embedUsage);

    await db.update(documents)
      .set({ costEmbedder, totalCost: sql`${documents.totalCost} + ${costEmbedder}` })
      .where(eq(documents.id, documentId));

    await logAgentEnd(embedLogId, `${embeddings.length} vectores`, { input: embedUsage.total_tokens, output: 0 });

    /* ── 6. Inserción Final ── */
    await Promise.allSettled(
      chunkResult.data.map((c, i) => db.insert(documentChunks).values({
        id: createId(),
        documentId,
        content: c.content,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        sectionTitle: c.sectionTitle,
        chunkType: c.chunkType,
        hasWarning: c.hasWarning ? 1 : 0,
        contentTokens: c.tokenEstimate,
        embedding: embeddings[i],
      }))
    );

    await updateDocumentStatus(documentId, 'ready', `Listo: ${chunkResult.data.length} chunks de texto vectorizados.`);

    // Inicializar snapshot de métricas (chunks registrados)
    await updateIndexingMetricsSnapshot(documentId);

    // Lanzar el Agente Curioso en background (no bloquear el ready)
    // El documento ya está listo para usar mientras esto corre en paralelo
    runCuriousAgent(documentId).catch(err => {
      console.error('[curious] Error en agente curioso:', (err as Error).message);
      // No cambiar el status del documento — el RAG ya funciona
    });

  } catch (err: any) {
    console.error(`[pipeline] Fatal error in ${documentId}:`, err);
    await updateDocumentStatus(documentId, 'error', err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   HANDLER HTTP
═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const form = await request.formData();
    console.log('[API/upload] Form data keys:', Array.from(form.keys()));
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });

    const pdfUrl = await uploadPdf(file.name, file);
    const documentId = createId();

    await db.insert(documents).values({
      id: documentId,
      title: form.get('title') as string || file.name,
      brand: form.get('brand') as string || 'Schindler',
      equipmentModel: form.get('equipmentModel') as string || null,
      docType: form.get('docType') as string || 'manual',
      pdfUrl,
      status: 'pending',
      fileSizeKb: Math.round(file.size / 1024),
      auditorRecommendation: (form.get('auditorRecommendation') as string) || null,
      createdBy: user?.id || null,
    });

    waitUntil(processDocumentPipeline(documentId, pdfUrl, form.get('title') as string || file.name, form.get('docType') as string || 'manual'));

    return NextResponse.json({ documentId, status: 'pending' });
  } catch (error: any) {
    console.error('[API/upload] Fatal Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
