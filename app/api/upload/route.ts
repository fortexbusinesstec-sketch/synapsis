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
import { waitUntil }          from '@vercel/functions';
import { NextResponse }        from 'next/server';
import { eq, sql }             from 'drizzle-orm';
import { createId }            from '@paralleldrive/cuid2';

import { db }                  from '@/lib/db';
import { documents, documentChunks, extractedImages } from '@/lib/db/schema';
import { updateDocumentStatus } from '@/lib/db/turso';
import { uploadPdf, uploadImage } from '@/lib/storage/blob';
import { calculateAgentCost, RATES }  from '@/lib/utils/costs';

import { runOrchestrator }     from '@/lib/agents/orchestrator';
import { runOcr }              from '@/lib/agents/ocr';
import type { OcrPage }        from '@/lib/agents/ocr';
import { processImage as visionRoute, type ImageInput, type ImageResult } from '@/lib/agents/vision';
import { runVectorScanner }    from '@/lib/agents/vector-scanner';
import { chunkAllPages }       from '@/lib/agents/chunker';
import { embedAll }            from '@/lib/agents/embedder';
import { logAgentStart, logAgentEnd, logAgentError } from '@/lib/agents/logger';
import { runCuriousAgent }     from '@/lib/agents/curious';

/* ── Vercel: permitir hasta 5 minutos (función de larga duración) ──────── */
export const maxDuration = 300;

/* ═══════════════════════════════════════════════════════════════════════
   CAMINO A — Texto: chunking semántico
═══════════════════════════════════════════════════════════════════════ */

interface PreparedChunk {
  content:       string;
  pageNumber:    number;
  chunkIndex:    number;
  sectionTitle:  string | null;
  chunkType:     string;
  hasWarning:    boolean;
  tokenEstimate: number;
}

async function prepareTextChunks(
  documentId: string,
  pages:      OcrPage[],
): Promise<{ data: PreparedChunk[]; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const logId = await logAgentStart(
    documentId,
    'chunker',
    `${pages.length} páginas a fragmentar`,
  );

  try {
    const { data: chunks, usage } = await chunkAllPages(pages);
    const result: PreparedChunk[] = chunks.map((c) => ({
      content:       c.content,
      pageNumber:    c.page_number,
      chunkIndex:    c.chunk_index,
      sectionTitle:  c.section_title,
      chunkType:     c.chunk_type,
      hasWarning:    c.has_warning,
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
  imageUrl:    string;
  pageNumber:  number;
  imageType:   string;
  confidence:  number;
  description: string;
  isCritical:  boolean;
  metadata?:   string;    // JSON — presente solo en imágenes del VectorScanner
}

async function prepareImages(
  documentId:    string,
  pages:         OcrPage[],
  imageMetadata: Map<string, string> = new Map(),
): Promise<{ data: PreparedImage[]; usage: { pixtral_tokens: number; gpt4o_tokens: number } }> {
  const totalImages = pages.reduce((sum, p) => sum + p.images.length, 0);
  const vsCount     = [...imageMetadata.keys()].length;
  const logId = await logAgentStart(
    documentId,
    'vision',
    `${totalImages} imágenes (${vsCount} VectorScanner→GPT-4o, ${totalImages - vsCount} OCR→Pixtral triaje)`,
  );

  const finalImages: PreparedImage[] = [];

  // Contadores por ruta — FinOps + auditoría
  let route1Count         = 0;   // Ruta 1: VectorScanner → GPT-4o
  let layer1Discarded     = 0;   // Ruta 2: Pixtral Capa 1 descartadas
  let layer2Escalated     = 0;   // Ruta 2: Pixtral Capa 2 → GPT-4o
  let layer3Kept          = 0;   // Ruta 2: Pixtral Capa 3 guardadas
  let layer3Discarded     = 0;   // Ruta 2: Pixtral Capa 3 rechazadas
  let errors              = 0;

  // Tokens separados por modelo (FinOps)
  let pixtralTokensTotal  = 0;
  let gpt4oTokensTotal    = 0;

  const allTechnicalElements: string[] = [];

  const CONCURRENCY = 8;
  const imageQueue: Array<{ img: any; page: OcrPage }> = [];
  for (const page of pages) {
    for (const img of page.images) {
      if (img.imageBase64) imageQueue.push({ img, page });
    }
  }

  const processTask = async (task: { img: any; page: OcrPage }) => {
    const { img, page } = task;
    try {
      const imgInput: ImageInput = {
        id:          img.id,
        imageBase64: img.imageBase64,
        metadata:    imageMetadata.get(img.id),
      };

      const result: ImageResult | null = await visionRoute(imgInput, {
        prev:    pages[page.index - 1]?.markdown,
        current: page.markdown,
        next:    pages[page.index + 1]?.markdown,
      });

      if (!result) {
        // Determinar tipo de descarte para el log
        const vsSource = imageMetadata.has(img.id);
        if (!vsSource) layer1Discarded++; // Pixtral Capa 1 o Capa 3 rechazada
        else layer3Discarded++;           // no debería ocurrir en Ruta 1, pero por seguridad
        return;
      }

      // Actualizar contadores de ruta y tokens
      pixtralTokensTotal += result.usage.pixtral_tokens;
      gpt4oTokensTotal   += result.usage.gpt4o_tokens;

      if (result.route === 'vector_scanner') {
        route1Count++;
      } else if (result.route === 'escalated_from_pixtral') {
        layer2Escalated++;
      } else {
        // pixtral_direct (Capa 3 guardada)
        if (result.classification_layer === 3) layer3Kept++;
        else layer2Escalated++;  // fallback de GPT-4o que terminó con pixtral
      }

      if (result.technical_elements.length > 0) {
        allTechnicalElements.push(...result.technical_elements);
      }

      // Subir al storage solo si pasa el filtro
      const hasPrefix = img.imageBase64.includes(';base64,');
      const mimeType  = hasPrefix
        ? (img.imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] ?? 'image/png')
        : 'image/png';
      const ext       = mimeType.split('/')[1] ?? 'png';
      const rawBase64 = hasPrefix ? img.imageBase64.split(',')[1] : img.imageBase64;
      const buffer    = Buffer.from(rawBase64, 'base64');

      const imageUrl = await uploadImage(`${documentId}/${img.id}.${ext}`, buffer, mimeType);

      // Construir metadata enriquecida: origen VS + análisis de visión
      const vsMeta = imageMetadata.has(img.id)
        ? JSON.parse(imageMetadata.get(img.id)!)
        : {};
      const richMetadata = JSON.stringify({
        ...vsMeta,
        vision_model:         result.visionModel,
        route:                result.route,
        classification_layer: result.classification_layer,
        ...(result.connections?.length       ? { connections:       result.connections }       : {}),
        ...(result.electrical_values?.length ? { electrical_values: result.electrical_values } : {}),
      });

      finalImages.push({
        imageUrl,
        pageNumber:  page.index + 1,
        imageType:   result.type,
        confidence:  result.confidence,
        description: result.description,
        isCritical:  result.has_warning,
        metadata:    richMetadata,
      });

    } catch (imgError) {
      console.error(`[vision] Error img pág.${page.index + 1}:`, imgError);
      errors++;
    }
  };

  // Worker pool — ejecución en paralelo controlada
  try {
    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const worker = (async () => {
        while (imageQueue.length > 0) {
          const task = imageQueue.shift();
          if (task) await processTask(task);
        }
      })();
      workers.push(worker);
    }
    await Promise.all(workers);

    const kept      = route1Count + layer2Escalated + layer3Kept;
    const discarded = layer1Discarded + layer3Discarded;
    const techSummary = allTechnicalElements.length > 0
      ? [...new Set(allTechnicalElements)].join(', ')
      : 'ninguno';

    await logAgentEnd(
      logId,
      `RUTA 1 (VectorScanner→GPT-4o): ${route1Count} | ` +
      `RUTA 2 Pixtral→Capa1 descartadas: ${layer1Discarded} | ` +
      `RUTA 2 Pixtral→Capa2→GPT-4o: ${layer2Escalated} | ` +
      `RUTA 2 Pixtral→Capa3 guardadas: ${layer3Kept} | ` +
      `Total conservadas: ${kept} | Total descartadas: ${discarded} | ` +
      `elementos: ${techSummary}`,
      { input: pixtralTokensTotal, output: gpt4oTokensTotal },
      {
        kept, discarded, errors, total: totalImages,
        route1Count, layer1Discarded, layer2Escalated, layer3Kept, layer3Discarded,
        pixtral_tokens: pixtralTokensTotal,
        gpt4o_tokens:   gpt4oTokensTotal,
      },
    );

    return { data: finalImages, usage: { pixtral_tokens: pixtralTokensTotal, gpt4o_tokens: gpt4oTokensTotal } };

  } catch (fatalError) {
    await logAgentError(logId, fatalError as Error);
    throw fatalError;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   PIPELINE PRINCIPAL (background)
═══════════════════════════════════════════════════════════════════════ */

async function processDocumentPipeline(
  documentId: string,
  pdfUrl:     string,
  title:      string,
  docType:    string,
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
    const rasterImagesFound  = ocr.pages.reduce((s, p) => s + p.images.length, 0);
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

    /* ── 3. VectorScanner — segunda pasada sobre páginas sin imágenes raster ── */
    await updateDocumentStatus(documentId, 'scanning_vectors', 'Escaneando vectores SVG…');
    const vsLogId = await logAgentStart(
      documentId,
      'vector_scanner',
      `${pagesWithoutImages} páginas sin imágenes raster de ${ocr.pageCount} totales`,
    );

    const vsResult = await runVectorScanner(pdfUrl, ocr.pages);

    // Enriquecer las páginas OCR con las imágenes recuperadas por el VectorScanner.
    // Se usa un Map imageId→metadata para propagar el origen sin modificar OcrImage.
    const imageMetadata = new Map<string, string>();
    let vectorImagesTotal = 0;

    for (const scannedPage of vsResult.pages) {
      const originalPage = ocr.pages.find(p => p.index + 1 === scannedPage.pageNumber);
      if (!originalPage) continue;

      for (const img of scannedPage.images) {
        if (!img.imageBase64) continue;
        originalPage.images.push(img);
        imageMetadata.set(img.id, JSON.stringify({
          source:                    'vector_scanner',
          extraction_method:         'page_range_rerender',
          original_page_had_images:  false,
        }));
        vectorImagesTotal++;
      }
    }

    // Costo estimado: misma tarifa que OCR (mismo modelo), ~800 tokens por página
    const costVectorScanner = calculateAgentCost('ocr', { pages: vsResult.stats.scanned });
    await db.update(documents)
      .set({ totalCost: sql`${documents.totalCost} + ${costVectorScanner}` })
      .where(eq(documents.id, documentId));

    await logAgentEnd(
      vsLogId,
      `${vectorImagesTotal} nuevas imágenes vectoriales encontradas en ${vsResult.stats.found} páginas | ${vsResult.stats.nullPages} páginas confirmadas sin contenido visual`,
      { input: vsResult.stats.scanned * 800, output: 0 },
      {
        ...vsResult.stats,
        newImages:          vectorImagesTotal,
        costVectorScanner,
      },
    );

    /* ── 4. Chunker & Vision (Paralelo) ── */
    await updateDocumentStatus(documentId, 'processing', 'Chunking y Visión…');

    const [chunkResult, visionResult] = await Promise.all([
      prepareTextChunks(documentId, ocr.pages),
      prepareImages(documentId, ocr.pages, imageMetadata),
    ]);

    const costChunker = calculateAgentCost('chunker', chunkResult.usage);

    // FinOps: costos separados por modelo de visión
    // Pixtral  $0.15 / 1M tokens  (triaje masivo, barato)
    // GPT-4o   $2.50 / 1M tokens  (análisis profundo, solo imágenes técnicas)
    const PIXTRAL_RATE = 0.15 / 1_000_000;
    const GPT4O_RATE   = 2.50 / 1_000_000;
    const costVision   =
      (visionResult.usage.pixtral_tokens * PIXTRAL_RATE) +
      (visionResult.usage.gpt4o_tokens   * GPT4O_RATE);

    await db.update(documents)
      .set({
        costChunker,
        costVision,
        totalCost: sql`${documents.totalCost} + ${costChunker} + ${costVision}`,
      })
      .where(eq(documents.id, documentId));

    /* ── 5. Embedder ── */
    await updateDocumentStatus(documentId, 'embedding', 'Vectorizando…');
    const embedLogId = await logAgentStart(documentId, 'embedder', 'Generando vectores');

    const totalTexts = [
      ...chunkResult.data.map(c => c.content),
      ...visionResult.data.map(v => v.description)
    ].filter(t => typeof t === 'string' && t.trim().length > 0);

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
    const chunkEmbeds = embeddings.slice(0, chunkResult.data.length);
    const imageEmbeds = embeddings.slice(chunkResult.data.length);

    await Promise.allSettled([
      ...chunkResult.data.map((c, i) => db.insert(documentChunks).values({
        id: createId(),
        documentId,
        content: c.content,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        sectionTitle: c.sectionTitle,
        chunkType: c.chunkType,
        hasWarning: c.hasWarning ? 1 : 0,
        contentTokens: c.tokenEstimate,
        embedding: chunkEmbeds[i],
      })),
      ...visionResult.data.map((img, i) => db.insert(extractedImages).values({
        id: createId(),
        documentId,
        pageNumber:  img.pageNumber,
        imageUrl:    img.imageUrl,
        imageType:   img.imageType,
        confidence:  img.confidence,
        description: img.description,
        isCritical:  img.isCritical ? 1 : 0,
        embedding:   imageEmbeds[i],
        ...(img.metadata ? { metadata: img.metadata } : {}),
      }))
    ]);

    await updateDocumentStatus(documentId, 'ready', `Listo: ${chunkResult.data.length} chunks y ${visionResult.data.length} imágenes`);

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
    });

    waitUntil(processDocumentPipeline(documentId, pdfUrl, form.get('title') as string || file.name, form.get('docType') as string || 'manual'));

    return NextResponse.json({ documentId, status: 'pending' });
  } catch (error: any) {
    console.error('[API/upload] Fatal Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
