/**
 * Agente 4 — Vector Scanner
 * Modelo: mistral-ocr-latest (segunda pasada con page_range)
 *
 * Propósito: los PDFs de manuales Schindler embeben diagramas como vectores SVG.
 * El OCR normal extrae imágenes rasterizadas pero ignora vectores completamente.
 * Este agente identifica páginas sospechosas (texto técnico denso, cero imágenes)
 * y re-renderiza cada una pidiéndole a Mistral que procese ese rango de página
 * específico, lo que fuerza la rasterización interna de los vectores.
 *
 * Se ejecuta DESPUÉS del OCR y ANTES de Pixtral/Vision para que las imágenes
 * recuperadas pasen por el mismo filtro de 3 capas.
 */
import { Mistral } from '@mistralai/mistralai';
import type { OcrPage, OcrImage } from './ocr';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

/* ── Tipos ─────────────────────────────────────────────────────────────── */

export interface ScannedPage {
  pageNumber:       number;
  originalMarkdown: string;
  images:           OcrImage[];
  source:           'vector_scanner';
}

export interface VectorScannerResult {
  pages: ScannedPage[];
  stats: {
    totalPages:      number;    // páginas OCR totales
    totalCandidates: number;    // candidatas antes del cap
    scanned:         number;    // efectivamente procesadas (cap MAX_VECTOR_SCAN_PAGES)
    found:           number;    // páginas donde se encontraron imágenes nuevas
    nullPages:       number;    // páginas escaneadas sin resultado
  };
}

/* ── Indicadores de diagrama (patrón en el markdown de la página) ──────── */

export const DIAGRAM_INDICATORS: RegExp[] = [
  /\b(SCIC|SMIC|SDIC|ACVF|SMLCD|HMI|LCUX|SNGL|ASIX|GSV|LDU|COP|LOP|SDIC7x)\b/i,
  /\b(KSE|KNE|KSKB|KSS|KTC|KTS|PHS|JHC|LIN|BIO|BUS|CAN|SIH|JH|RKPH)\b/i,
  /\d{3}[_-]\d{6}/,      // Códigos de plano tipo 220_000000
  /[A-Z]{1}\s*\d{6,}/,   // Códigos de plano tipo K 612089 o EJ 41410424
  /Fig\.\s*\d+/i,
];


export function isCandidate(page: OcrPage): boolean {
  if (page.images.length > 0) return false;       // ya tiene imágenes raster → skip
  return DIAGRAM_INDICATORS.some(p => p.test(page.markdown));
}

/** Puntuación de prioridad: cuántos indicadores matchean en el markdown */
function indicatorScore(page: OcrPage): number {
  return DIAGRAM_INDICATORS.filter(p => p.test(page.markdown)).length;
}

/* ── Límites de coste ───────────────────────────────────────────────────── */

const MAX_VECTOR_SCAN_PAGES = 30;
const CONCURRENCY           = 3;    // conservador — proceso secundario

/* ── scanPage ────────────────────────────────────────────────────────────── */

async function scanPage(
  pageNumber:   number,
  pageMarkdown: string,
  pdfUrl:       string,
): Promise<ScannedPage | null> {
  try {
    // Mistral OCR con pages: [n] fuerza la rasterización interna de la página n
    // y devuelve las imágenes (incluidos vectores SVG convertidos a raster).
    const ocrResult = await mistral.ocr.process({
      model:    'mistral-ocr-latest',
      document: {
        type:        'document_url',
        documentUrl: pdfUrl,
      },
      pages:              [pageNumber - 1],   // 0-indexed
      includeImageBase64: true,
    });

    const scannedPage = ocrResult.pages?.[0];
    if (!scannedPage || (scannedPage.images ?? []).length === 0) {
      return null;    // sin imágenes incluso con re-renderizado → página realmente vacía
    }

    const images: OcrImage[] = (scannedPage.images ?? []).map((img: any, j: number) => ({
      id:          img.id ?? `vs_p${pageNumber}_img${j}`,
      imageBase64: img.imageBase64 ?? null,
    }));

    return { pageNumber, originalMarkdown: pageMarkdown, images, source: 'vector_scanner' };

  } catch (error) {
    console.error(
      `[VectorScanner] Error en página ${pageNumber}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/* ── runVectorScanner ────────────────────────────────────────────────────── */

export async function runVectorScanner(
  pdfUrl: string,
  pages:  OcrPage[],
): Promise<VectorScannerResult> {
  // ── Paso 1: identificar candidatas ──────────────────────────────────────
  const allCandidates = pages.filter(isCandidate);

  // Priorizar por densidad de indicadores (más siglas técnicas → primero)
  allCandidates.sort((a, b) => indicatorScore(b) - indicatorScore(a));

  const candidatesToScan = allCandidates.slice(0, MAX_VECTOR_SCAN_PAGES);

  if (allCandidates.length > MAX_VECTOR_SCAN_PAGES) {
    console.warn(
      `[VectorScanner] ${allCandidates.length} candidatas encontradas — ` +
      `procesando las ${MAX_VECTOR_SCAN_PAGES} con mayor densidad de indicadores`,
    );
  }

  console.log(
    `[VectorScanner] ${candidatesToScan.length} páginas candidatas ` +
    `de ${pages.length} totales (${pages.length - allCandidates.length} descartadas por tener raster o sin indicadores)`,
  );

  if (candidatesToScan.length === 0) {
    return {
      pages: [],
      stats: {
        totalPages:      pages.length,
        totalCandidates: 0,
        scanned:         0,
        found:           0,
        nullPages:       0,
      },
    };
  }

  // ── Paso 2: escanear en batches con concurrencia controlada ─────────────
  const results: ScannedPage[] = [];

  for (let i = 0; i < candidatesToScan.length; i += CONCURRENCY) {
    const batch = candidatesToScan.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(page => scanPage(page.index + 1, page.markdown, pdfUrl)),
    );

    results.push(...batchResults.filter((r): r is ScannedPage => r !== null));

    // Pausa entre batches para respetar rate limits
    if (i + CONCURRENCY < candidatesToScan.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const found     = results.length;
  const nullPages = candidatesToScan.length - found;

  console.log(
    `[VectorScanner] Resultado: ${found} páginas con imágenes nuevas | ` +
    `${nullPages} páginas confirmadas sin contenido visual`,
  );

  return {
    pages: results,
    stats: {
      totalPages:      pages.length,
      totalCandidates: allCandidates.length,
      scanned:         candidatesToScan.length,
      found,
      nullPages,
    },
  };
}
